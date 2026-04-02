"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { AISuggestion } from "@/lib/types";
import { TRANSITION_LABELS } from "@/lib/clips";
import { clsx } from "clsx";

const KIND_ICONS: Record<AISuggestion["kind"], string> = {
  hook:       "🎯",
  reorder:    "🔀",
  transition: "🎬",
  remove:     "✂️",
  caption:    "💬",
  pacing:     "⚡",
};

const PRIORITY_COLORS: Record<AISuggestion["priority"], string> = {
  high:   "border-red-800/60 bg-red-950/20",
  medium: "border-amber-800/60 bg-amber-950/20",
  low:    "border-zinc-700 bg-zinc-900",
};

const PRIORITY_DOT: Record<AISuggestion["priority"], string> = {
  high:   "bg-red-500",
  medium: "bg-amber-500",
  low:    "bg-zinc-500",
};

export function AISuggestionsPanel() {
  const suggestions = useProjectStore((s) => s.suggestions);
  const loading = useProjectStore((s) => s.suggestionsLoading);
  const applyReorder = useProjectStore((s) => s.applyReorderSuggestion);
  const applyTransition = useProjectStore((s) => s.applyTransitionSuggestion);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          AI Suggestions
        </h2>
        {loading && (
          <svg className="animate-spin w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {!loading && suggestions.length === 0 && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          Add clips and the AI will analyse them for editing suggestions.
        </p>
      )}

      {suggestions.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          onApplyReorder={s.suggestedOrder ? () => applyReorder(s.suggestedOrder!) : undefined}
          onApplyTransition={
            s.suggestedTransition && s.clipId
              ? () => applyTransition(s.clipId!, s.suggestedTransition!)
              : undefined
          }
        />
      ))}

      {suggestions.length > 0 && (
        <p className="text-[11px] text-zinc-700 text-center pt-1">
          {process.env.NEXT_PUBLIC_HAS_API_KEY ? "Powered by Claude" : "Using mock suggestions · add ANTHROPIC_API_KEY to use Claude"}
        </p>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApplyReorder,
  onApplyTransition,
}: {
  suggestion: AISuggestion;
  onApplyReorder?: () => void;
  onApplyTransition?: () => void;
}) {
  const hasAction = onApplyReorder || onApplyTransition;

  return (
    <div
      className={clsx(
        "p-3 rounded-xl border space-y-2 transition-colors",
        PRIORITY_COLORS[suggestion.priority]
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5">{KIND_ICONS[suggestion.kind]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[suggestion.priority])} />
            <span className="text-xs font-semibold text-zinc-200 leading-tight">{suggestion.title}</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{suggestion.description}</p>
        </div>
      </div>

      {/* Action buttons */}
      {hasAction && (
        <div className="flex gap-2 pt-0.5">
          {onApplyReorder && (
            <button
              onClick={onApplyReorder}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
            >
              Apply order
            </button>
          )}
          {onApplyTransition && suggestion.suggestedTransition && (
            <button
              onClick={onApplyTransition}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
            >
              Use {TRANSITION_LABELS[suggestion.suggestedTransition]}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
