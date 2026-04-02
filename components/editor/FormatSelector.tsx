"use client";

import { VIDEO_FORMATS } from "@/lib/formats";
import { FormatId, VideoFormat } from "@/lib/types";
import { useProjectStore } from "@/store/useProjectStore";
import { clsx } from "clsx";

export function FormatSelector() {
  const format = useProjectStore((s) => s.project.format);
  const setFormat = useProjectStore((s) => s.setFormat);

  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.values(VIDEO_FORMATS) as VideoFormat[]).map((f) => (
        <FormatCard
          key={f.id}
          format={f}
          isActive={format.id === f.id}
          onClick={() => setFormat(f.id as FormatId)}
        />
      ))}
    </div>
  );
}

function FormatCard({
  format, isActive, onClick,
}: {
  format: VideoFormat;
  isActive: boolean;
  onClick: () => void;
}) {
  // Visual preview of aspect ratio
  const previewW = 28;
  const previewH = Math.round(previewW * (format.height / format.width));
  const cappedH = Math.min(previewH, 44);
  const cappedW = Math.round(cappedH * (format.width / format.height));

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
        isActive
          ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500"
          : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
      )}
    >
      {/* Aspect ratio visual */}
      <div className="flex items-center justify-center h-12">
        <div
          style={{ width: cappedW, height: cappedH }}
          className={clsx(
            "rounded-sm border-2 transition-colors",
            isActive ? "border-emerald-400 bg-emerald-900/40" : "border-zinc-500 bg-zinc-800"
          )}
        />
      </div>

      <div className="text-center">
        <div className={clsx("text-xs font-semibold", isActive ? "text-emerald-300" : "text-zinc-200")}>
          {format.label}
        </div>
        <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{format.sublabel}</div>
      </div>
    </button>
  );
}
