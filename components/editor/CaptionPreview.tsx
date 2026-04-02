"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { PRESETS } from "@/lib/mock";
import { CaptionPreset } from "@/lib/types";

export function CaptionPreview() {
  const preset = useProjectStore((s) => s.project.preset);
  const captions = useProjectStore((s) => s.project.captions);
  const p = PRESETS[preset];

  const sampleText = captions[0]?.text ?? "Caption preview text goes here.";

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium uppercase tracking-wider">
        Caption Preview — {preset}
      </div>

      {/* Simulated video frame */}
      <div
        className="relative h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-end justify-center"
        style={{ padding: "0 12px 12px" }}
      >
        <CaptionBox text={sampleText} preset={p} />
      </div>
    </div>
  );
}

function CaptionBox({ text, preset }: { text: string; preset: CaptionPreset }) {
  const bgColor =
    preset.backgroundColor === "transparent"
      ? "transparent"
      : hexToRgba(preset.backgroundColor, preset.backgroundOpacity);

  return (
    <div
      style={{
        fontFamily: preset.fontFamily,
        fontSize: Math.round(preset.fontSize * 0.4), // scale down for the preview card
        fontWeight: preset.fontWeight,
        color: preset.color,
        backgroundColor: bgColor,
        padding: `${preset.padding * 0.4}px ${preset.padding * 0.8}px`,
        borderRadius: preset.borderRadius,
        textShadow:
          preset.backgroundColor === "transparent"
            ? "0 1px 3px rgba(0,0,0,0.9)"
            : "none",
        maxWidth: "90%",
        textAlign: "center",
        lineHeight: 1.3,
      }}
    >
      {text}
    </div>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
