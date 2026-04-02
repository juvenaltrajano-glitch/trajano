"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { Segment } from "@/lib/types";

interface Suggestion {
  id: string;
  type: "warning" | "info" | "tip";
  message: string;
  action?: { label: string; segmentId?: string };
}

// Analyse segments and produce smart edit suggestions
function analyzeSuggestions(segments: Segment[], duration: number): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const kept = segments.filter((s) => s.kind === "keep");
  const removed = segments.filter((s) => s.kind === "removed");

  // Very short kept segments (< 0.4s) — likely too choppy
  kept.forEach((s) => {
    const d = s.endTime - s.startTime;
    if (d < 0.4) {
      suggestions.push({
        id: `short-${s.id}`,
        type: "warning",
        message: `Segment at ${fmt(s.startTime)} is very short (${(d * 1000).toFixed(0)} ms). Consider removing.`,
        action: { label: "Remove", segmentId: s.id },
      });
    }
  });

  // Long removed sections (> 5s) — unusual, may be an error
  removed.forEach((s) => {
    const d = s.endTime - s.startTime;
    if (d > 5) {
      suggestions.push({
        id: `long-remove-${s.id}`,
        type: "warning",
        message: `Large gap removed at ${fmt(s.startTime)} (${d.toFixed(1)}s). Verify this is intentional.`,
        action: { label: "Restore", segmentId: s.id },
      });
    }
  });

  // Good compression ratio
  const removedDuration = removed.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const ratio = removedDuration / duration;
  if (ratio > 0.25) {
    suggestions.push({
      id: "good-compression",
      type: "info",
      message: `${Math.round(ratio * 100)}% of silence removed — great pacing improvement!`,
    });
  }

  // Suggest karaoke for TikTok/Reels style
  if (kept.length > 0 && suggestions.length === 0) {
    suggestions.push({
      id: "tip-karaoke",
      type: "tip",
      message: "Enable Karaoke Mode in Captions for word-by-word highlight — great for TikTok.",
    });
  }

  return suggestions.slice(0, 3); // max 3 at a time
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const ICONS: Record<Suggestion["type"], string> = {
  warning: "⚠️",
  info: "✅",
  tip: "💡",
};

const COLORS: Record<Suggestion["type"], string> = {
  warning: "border-amber-700/60 bg-amber-950/20 text-amber-300",
  info: "border-emerald-700/60 bg-emerald-950/20 text-emerald-300",
  tip: "border-blue-700/60 bg-blue-950/20 text-blue-300",
};

export function SuggestionBar() {
  const segments = useProjectStore((s) => s.project.segments);
  const duration = useProjectStore((s) => s.project.duration);
  const toggleSegment = useProjectStore((s) => s.toggleSegment);

  const suggestions = analyzeSuggestions(segments, duration);

  if (!suggestions.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        Suggestions
      </h3>
      <div className="space-y-1.5">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${COLORS[s.type]}`}
          >
            <span className="text-sm leading-none mt-0.5">{ICONS[s.type]}</span>
            <span className="flex-1 leading-relaxed">{s.message}</span>
            {s.action?.segmentId && (
              <button
                onClick={() => toggleSegment(s.action!.segmentId!)}
                className="shrink-0 underline underline-offset-2 opacity-80 hover:opacity-100"
              >
                {s.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
