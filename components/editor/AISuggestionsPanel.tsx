"use client";

import { useEffect, useState } from "react";
import { useProjectStore, getSortedClips } from "@/store/useProjectStore";
import { AISuggestion } from "@/lib/types";
import { TRANSITION_LABELS } from "@/lib/clips";
import { generateMockSuggestions } from "@/lib/aiSuggestions";
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
  const setSuggestions = useProjectStore((s) => s.setSuggestions);
  const setSuggestionsLoading = useProjectStore((s) => s.setSuggestionsLoading);
  const applyReorder = useProjectStore((s) => s.applyReorderSuggestion);
  const applyTransition = useProjectStore((s) => s.applyTransitionSuggestion);
  const project = useProjectStore((s) => s.project);
  const clips = getSortedClips(project);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setHasKey(d.hasAnthropicKey ?? false))
      .catch(() => setHasKey(false));
  }, []);

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  async function handleRegenerate() {
    setSuggestionsLoading(true);
    setDismissed(new Set());
    try {
      const payload = {
        clips: clips.map((c) => ({
          id: c.id, name: c.name, duration: c.duration,
          keptDuration: c.segments.filter((s) => s.kind === "keep").reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
          segmentCount: c.segments.filter((s) => s.kind === "keep").length,
          removedSegmentCount: c.segments.filter((s) => s.kind === "removed").length,
          captionSamples: c.captions.slice(0, 3).map((cap) => cap.text),
        })),
        format: project.format.label,
        preset: project.preset,
      };
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 501 || !res.ok) {
        setSuggestions(generateMockSuggestions(clips));
      } else {
        const data = await res.json();
        setSuggestions(data.suggestions?.length > 0 ? data.suggestions : generateMockSuggestions(clips));
      }
    } catch {
      setSuggestions(generateMockSuggestions(clips));
    } finally {
      setSuggestionsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">AI Suggestions</h2>
        <div className="flex items-center gap-2">
          {loading && (
            <svg className="animate-spin w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {clips.length > 0 && !loading && (
            <button
              onClick={handleRegenerate}
              className="text-[10px] text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* API key status */}
      {hasKey !== null && (
        <div className={clsx(
          "flex flex-col gap-1.5 px-2.5 py-2 rounded-lg text-[11px]",
          hasKey ? "bg-emerald-950/40 border border-emerald-800/50 text-emerald-400" : "bg-zinc-900 border border-zinc-700 text-zinc-400"
        )}>
          <div className="flex items-center gap-1.5">
            <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", hasKey ? "bg-emerald-400" : "bg-amber-500")} />
            {hasKey ? "Claude AI — real suggestions active" : "Mock suggestions — no API key found"}
          </div>
          {!hasKey && (
            <div className="text-zinc-500 leading-relaxed space-y-0.5 mt-0.5">
              <div>To enable real AI suggestions:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-zinc-600">
                <li>Vercel project → Settings → Environment Variables</li>
                <li>Add <code className="bg-zinc-800 px-1 rounded text-zinc-300">ANTHROPIC_API_KEY</code></li>
                <li>Deployments → Redeploy</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {!loading && visibleSuggestions.length === 0 && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          {clips.length === 0
            ? "Add clips and the AI will analyse them for editing suggestions."
            : "All suggestions reviewed. Click Regenerate for new ones."}
        </p>
      )}

      {visibleSuggestions.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          onApplyReorder={s.suggestedOrder ? () => applyReorder(s.suggestedOrder!) : undefined}
          onApplyTransition={s.suggestedTransition && s.clipId ? () => applyTransition(s.clipId!, s.suggestedTransition!) : undefined}
          onDismiss={() => setDismissed((prev) => new Set([...prev, s.id]))}
        />
      ))}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApplyReorder,
  onApplyTransition,
  onDismiss,
}: {
  suggestion: AISuggestion;
  onApplyReorder?: () => void;
  onApplyTransition?: () => void;
  onDismiss?: () => void;
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
            <span className="text-xs font-semibold text-zinc-200 leading-tight flex-1">{suggestion.title}</span>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs leading-none shrink-0 ml-1"
                aria-label="Dismiss suggestion"
              >
                ✕
              </button>
            )}
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
