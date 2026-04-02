"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { Segment } from "@/lib/types";
import { clsx } from "clsx";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

export function SegmentTimeline() {
  const project = useProjectStore((s) => s.project);
  const toggleSegment = useProjectStore((s) => s.toggleSegment);

  const { segments, duration } = project;

  if (!segments.length) {
    return (
      <div className="h-12 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 text-sm">
        No segments detected yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>0:00</span>
        <span>Timeline — click a segment to toggle keep/remove</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Proportional bar */}
      <div className="flex h-10 rounded-lg overflow-hidden gap-px">
        {segments.map((seg) => (
          <SegmentBar
            key={seg.id}
            seg={seg}
            totalDuration={duration}
            onClick={() => toggleSegment(seg.id)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
          Keep
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-zinc-700 inline-block" />
          Removed
        </span>
      </div>
    </div>
  );
}

function SegmentBar({
  seg,
  totalDuration,
  onClick,
}: {
  seg: Segment;
  totalDuration: number;
  onClick: () => void;
}) {
  const widthPct = ((seg.endTime - seg.startTime) / totalDuration) * 100;
  const dur = (seg.endTime - seg.startTime).toFixed(1);

  return (
    <div
      title={`${seg.kind === "keep" ? "Keep" : "Removed"} · ${formatTime(seg.startTime)} – ${formatTime(seg.endTime)} (${dur}s)\nClick to toggle`}
      onClick={onClick}
      style={{ width: `${widthPct}%`, minWidth: 2 }}
      className={clsx(
        "h-full cursor-pointer transition-colors group relative",
        seg.kind === "keep"
          ? "bg-emerald-500 hover:bg-emerald-400"
          : "bg-zinc-700 hover:bg-zinc-600"
      )}
    />
  );
}
