"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { ClipTransition, TransitionType } from "@/lib/types";
import { TRANSITION_ICONS, TRANSITION_LABELS } from "@/lib/clips";
import { clsx } from "clsx";

const TRANSITION_TYPES: TransitionType[] = [
  "none", "fade", "slide-left", "slide-right",
  "slide-up", "slide-down", "wipe", "flip", "clock-wipe",
];

interface Props {
  clipId: string;
  current: ClipTransition;
  fps: number;
  onClose: () => void;
}

export function TransitionPicker({ clipId, current, fps, onClose }: Props) {
  const setTransition = useProjectStore((s) => s.setClipTransition);

  function handleSelect(type: TransitionType) {
    setTransition(clipId, type);
    if (type === "none") onClose();
  }

  function handleDurationChange(frames: number) {
    setTransition(clipId, current.type, frames);
  }

  const durationOptions = [6, 9, 15, 20, 30]; // frames at 30fps → 0.2s, 0.3s, 0.5s, 0.67s, 1s

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Transition
        </span>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-sm">✕</button>
      </div>

      {/* Type grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {TRANSITION_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            className={clsx(
              "flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-colors",
              current.type === type
                ? "border-emerald-500 bg-emerald-950/30 text-emerald-300"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            )}
          >
            <span className="text-base leading-none">{TRANSITION_ICONS[type]}</span>
            <span className="leading-tight text-center">{TRANSITION_LABELS[type]}</span>
          </button>
        ))}
      </div>

      {/* Duration picker (hidden for "none") */}
      {current.type !== "none" && (
        <div className="space-y-1.5">
          <div className="text-xs text-zinc-500">Duration</div>
          <div className="flex gap-1.5">
            {durationOptions.map((frames) => {
              const seconds = (frames / fps).toFixed(2).replace(/\.?0+$/, "");
              return (
                <button
                  key={frames}
                  onClick={() => handleDurationChange(frames)}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    current.durationFrames === frames
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  )}
                >
                  {seconds}s
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
