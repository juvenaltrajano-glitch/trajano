"use client";

import { useState } from "react";
import { useProjectStore, getSortedClips } from "@/store/useProjectStore";
import { Clip } from "@/lib/types";
import { TRANSITION_LABELS, TRANSITION_ICONS } from "@/lib/clips";
import { clsx } from "clsx";
import { TransitionPicker } from "./TransitionPicker";

export function ClipManager() {
  const clips = useProjectStore((s) => getSortedClips(s.project));
  const removeClip = useProjectStore((s) => s.removeClip);
  const reorderClip = useProjectStore((s) => s.reorderClip);
  const [dragging, setDragging] = useState<string | null>(null);
  const [openTransition, setOpenTransition] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, clipId: string) {
    setDragging(clipId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (!dragging) return;
    reorderClip(dragging, targetIndex);
    setDragging(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  if (clips.length === 0) {
    return (
      <div className="py-6 text-center text-zinc-600 text-sm">
        No clips added yet. Upload videos on the home page.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {clips.map((clip, index) => (
        <div key={clip.id}>
          {/* Transition badge between clips */}
          {index > 0 && (
            <button
              onClick={() => setOpenTransition(openTransition === clip.id ? null : clip.id)}
              className="flex items-center gap-1.5 mx-auto mb-1 px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700"
            >
              <span>{TRANSITION_ICONS[clip.transition.type]}</span>
              <span>{TRANSITION_LABELS[clip.transition.type]}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">
                {(clip.transition.durationFrames / (clip.fps || 30)).toFixed(1)}s
              </span>
            </button>
          )}

          {/* Transition picker (inline dropdown) */}
          {openTransition === clip.id && (
            <div className="mb-2">
              <TransitionPicker
                clipId={clip.id}
                current={clip.transition}
                fps={clip.fps}
                onClose={() => setOpenTransition(null)}
              />
            </div>
          )}

          {/* Clip card */}
          <ClipCard
            clip={clip}
            index={index}
            isDragging={dragging === clip.id}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnd={() => setDragging(null)}
            onRemove={() => removeClip(clip.id)}
          />
        </div>
      ))}
    </div>
  );
}

interface ClipCardProps {
  clip: Clip;
  index: number;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRemove: () => void;
}

function ClipCard({ clip, index, isDragging, onDragStart, onDrop, onDragOver, onDragEnd, onRemove }: ClipCardProps) {
  const kept = clip.segments.filter((s) => s.kind === "keep");
  const keptDuration = kept.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const compressionPct = clip.duration > 0 ? Math.round((keptDuration / clip.duration) * 100) : 100;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, clip.id)}
      onDrop={(e) => onDrop(e, index)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={clsx(
        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing",
        isDragging
          ? "opacity-40 border-zinc-600 bg-zinc-900"
          : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
      )}
    >
      {/* Drag handle + index */}
      <div className="flex flex-col items-center gap-0.5 text-zinc-600 shrink-0">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
        <span className="text-[10px] text-zinc-600">{index + 1}</span>
      </div>

      {/* Thumbnail placeholder */}
      <div className="w-14 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
        {clip.videoUrl ? (
          <video
            src={clip.videoUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <span className="text-zinc-600 text-xs">🎬</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200 truncate">{clip.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-zinc-500">{keptDuration.toFixed(1)}s</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden max-w-16">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${compressionPct}%` }}
            />
          </div>
          <span className="text-[11px] text-zinc-600">{compressionPct}%</span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
        title="Remove clip"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
