import { AISuggestion, Clip, SuggestionKind, TransitionType } from "./types";

// ─── Request/response shape shared by mock and real ──────────────────────────

export interface SuggestRequest {
  clips: Array<{
    id: string;
    name: string;
    duration: number;
    keptDuration: number;
    segmentCount: number;
    removedSegmentCount: number;
    captionSamples: string[];
  }>;
  format: string;
  preset: string;
}

// Build a lean request payload from Clip[] (no binary data)
export function buildSuggestRequest(clips: Clip[], format: string, preset: string): SuggestRequest {
  return {
    clips: clips
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        duration: c.duration,
        keptDuration: c.segments
          .filter((s) => s.kind === "keep")
          .reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
        segmentCount: c.segments.filter((s) => s.kind === "keep").length,
        removedSegmentCount: c.segments.filter((s) => s.kind === "removed").length,
        captionSamples: c.captions.slice(0, 3).map((cap) => cap.text),
      })),
    format,
    preset,
  };
}

// ─── Mock suggestions (no API key needed) ────────────────────────────────────

export function generateMockSuggestions(clips: Clip[]): AISuggestion[] {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  const suggestions: AISuggestion[] = [];

  if (sorted.length === 0) return [];

  const totalKept = sorted.reduce((sum, c) =>
    sum + c.segments.filter((s) => s.kind === "keep").reduce((cs, s) => cs + (s.endTime - s.startTime), 0), 0
  );

  // 1. Hook: always recommend strong opening
  suggestions.push({
    id: "hook-1",
    kind: "hook",
    priority: "high",
    title: "Start with your best moment",
    description: `"${sorted[0].name}" opens your video. Hook viewers in the first 3 seconds — skip any slow intro and start mid-action or with a surprising statement.`,
    clipId: sorted[0].id,
  });

  // 2. Caption suggestion: always useful
  suggestions.push({
    id: "caption-1",
    kind: "caption",
    priority: "high",
    title: "Add captions for silent viewers",
    description: "85% of social videos are watched without sound. Enable Karaoke Mode (Captions tab) and generate captions to keep viewers engaged.",
  });

  // 3. Pacing: total duration check
  if (totalKept > 60) {
    suggestions.push({
      id: "pacing-duration",
      kind: "pacing",
      priority: "high",
      title: "Trim for social media length",
      description: `Your edit is ${Math.round(totalKept)}s. TikTok/Reels perform best under 60s. Consider removing more segments or splitting into a series.`,
    });
  } else if (totalKept < 15 && sorted.length === 1) {
    suggestions.push({
      id: "pacing-short",
      kind: "pacing",
      priority: "medium",
      title: "Consider adding more content",
      description: `At ${Math.round(totalKept)}s, this video is very short. Add an intro clip or outro with a CTA to increase watch time.`,
    });
  }

  // 4. Pacing: flag clips with high silence removal ratio
  sorted.forEach((clip) => {
    const kept = clip.segments
      .filter((s) => s.kind === "keep")
      .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const ratio = kept / Math.max(clip.duration, 1);
    if (ratio < 0.5 && clip.duration > 5) {
      suggestions.push({
        id: `pacing-${clip.id}`,
        kind: "pacing",
        priority: "medium",
        title: `Heavy cuts in "${clip.name}"`,
        description: `Only ${Math.round(ratio * 100)}% kept — this may feel choppy. Try raising the Silence Threshold slider to keep more natural pauses.`,
        clipId: clip.id,
      });
    }
  });

  // 5. Transition suggestions
  sorted.forEach((clip, i) => {
    if (i === 0) return;
    const prev = sorted[i - 1];
    if (clip.transition.type === "none") {
      const type: TransitionType = i % 2 === 0 ? "slide-left" : "fade";
      suggestions.push({
        id: `transition-${clip.id}`,
        kind: "transition",
        priority: "low",
        title: `Add transition → "${clip.name}"`,
        description: `A ${type === "fade" ? "fade" : "slide"} transition between "${prev.name}" and "${clip.name}" would smooth the cut.`,
        clipId: clip.id,
        suggestedTransition: type,
      });
    }
  });

  // 6. Format suggestion: if aspect ratio isn't vertical for social
  suggestions.push({
    id: "format-1",
    kind: "hook",
    priority: "medium",
    title: "Use vertical format for TikTok/Reels",
    description: "Vertical (9:16 / 1080×1920) gets the most impressions on TikTok, Instagram Reels and YouTube Shorts. Change in the Format tab.",
  });

  // 7. Reorder: if more than 2 clips and first is shortest
  if (sorted.length >= 3) {
    const durations = sorted.map((c) => c.duration);
    const firstIsShort = durations[0] < Math.min(...durations.slice(1));
    if (firstIsShort) {
      const suggestedOrder = [sorted[1].id, sorted[0].id, ...sorted.slice(2).map((c) => c.id)];
      suggestions.push({
        id: "reorder-1",
        kind: "reorder",
        priority: "medium",
        title: "Reorder for better pacing",
        description: `Starting with "${sorted[1].name}" (longer) may create a stronger opening before cutting to "${sorted[0].name}".`,
        suggestedOrder,
      });
    }
  }

  return suggestions.slice(0, 7);
}

// ─── Real Claude API (POST /api/suggest, runs server-side) ───────────────────

// Parse Claude's JSON response into AISuggestion[]
export function parseSuggestions(rawJson: unknown): AISuggestion[] {
  if (!Array.isArray(rawJson)) return [];
  return (rawJson as Record<string, unknown>[])
    .filter((item) => item && typeof item === "object")
    .map((item, i) => ({
      id: `ai-${i}`,
      kind: (item.kind as SuggestionKind) ?? "pacing",
      priority: (item.priority as "high" | "medium" | "low") ?? "medium",
      title: String(item.title ?? "Suggestion"),
      description: String(item.description ?? ""),
      clipId: item.clipId ? String(item.clipId) : undefined,
      segmentId: item.segmentId ? String(item.segmentId) : undefined,
      suggestedOrder: Array.isArray(item.suggestedOrder)
        ? (item.suggestedOrder as string[])
        : undefined,
      suggestedTransition: item.suggestedTransition
        ? (item.suggestedTransition as TransitionType)
        : undefined,
      suggestedCaption: item.suggestedCaption ? String(item.suggestedCaption) : undefined,
    }));
}
