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

  // Hook suggestion: always recommend strong opening
  suggestions.push({
    id: "hook-1",
    kind: "hook",
    priority: "high",
    title: "Start with your best moment",
    description: `"${sorted[0].name}" is your opening clip. Make sure it hooks viewers in the first 3 seconds — consider starting mid-action.`,
    clipId: sorted[0].id,
  });

  // Pacing: flag clips with high silence removal ratio
  sorted.forEach((clip) => {
    const kept = clip.segments
      .filter((s) => s.kind === "keep")
      .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const ratio = kept / clip.duration;
    if (ratio < 0.5 && clip.duration > 5) {
      suggestions.push({
        id: `pacing-${clip.id}`,
        kind: "pacing",
        priority: "medium",
        title: `Heavy cuts in "${clip.name}"`,
        description: `Only ${Math.round(ratio * 100)}% of this clip is kept. This may feel choppy. Try raising the silence threshold.`,
        clipId: clip.id,
      });
    }
  });

  // Transition suggestions based on clip order
  sorted.forEach((clip, i) => {
    if (i === 0) return;
    const prev = sorted[i - 1];
    // Suggest cross-fade between clips with similar duration
    const similar = Math.abs(clip.duration - prev.duration) < 3;
    if (similar && clip.transition.type === "none") {
      suggestions.push({
        id: `transition-${clip.id}`,
        kind: "transition",
        priority: "low",
        title: `Add transition between "${prev.name}" and "${clip.name}"`,
        description: `These clips have similar length. A fade transition would feel natural here.`,
        clipId: clip.id,
        suggestedTransition: "fade" as TransitionType,
      });
    }
  });

  // Reorder: if more than 2 clips and first is shortest, suggest reordering
  if (sorted.length >= 3) {
    const durations = sorted.map((c) => c.duration);
    const firstIsShort = durations[0] < Math.min(...durations.slice(1));
    if (firstIsShort) {
      const suggestedOrder = [sorted[1].id, sorted[0].id, ...sorted.slice(2).map((c) => c.id)];
      suggestions.push({
        id: "reorder-1",
        kind: "reorder",
        priority: "medium",
        title: "Consider reordering clips for better pacing",
        description: `Starting with "${sorted[1].name}" (longer clip) may create a stronger opening before cutting to "${sorted[0].name}".`,
        suggestedOrder,
      });
    }
  }

  return suggestions.slice(0, 5);
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
