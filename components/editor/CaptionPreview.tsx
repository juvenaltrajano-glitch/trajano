"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { PRESETS } from "@/lib/mock";
import { CaptionPreset } from "@/lib/types";

export function CaptionPreview() {
  const preset = useProjectStore((s) => s.project.preset);
  const karaokeMode = useProjectStore((s) => s.project.karaokeMode);
  const captions = useProjectStore((s) => s.project.captions);
  const p = PRESETS[preset];

  const sampleText = captions[0]?.text ?? "Caption text preview";
  const words = sampleText.split(" ");

  return (
    <div className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          Caption Preview
        </span>
        <span className="text-xs text-zinc-600">
          {p.label} · {karaokeMode ? "karaoke" : "full"} · {p.animation}
        </span>
      </div>

      {/* Simulated video frame */}
      <div
        className="relative bg-gradient-to-br from-zinc-800 to-zinc-900"
        style={{ height: 96, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 12px 12px" }}
      >
        {/* Fake progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-700">
          <div className="h-full w-1/3 bg-emerald-500 rounded-r" />
        </div>

        {karaokeMode ? (
          <KaraokeSample words={words} preset={p} />
        ) : (
          <FullSample text={sampleText} preset={p} />
        )}
      </div>
    </div>
  );
}

function FullSample({ text, preset }: { text: string; preset: CaptionPreset }) {
  const bg = preset.backgroundColor === "transparent"
    ? "transparent"
    : hexToRgba(preset.backgroundColor, preset.backgroundOpacity);

  const isGradient = preset.name === "gradient";
  const background = isGradient
    ? `linear-gradient(135deg, ${hexToRgba(preset.backgroundColor, preset.backgroundOpacity)}, ${hexToRgba("#8B5CF6", preset.backgroundOpacity)})`
    : bg;

  return (
    <div
      style={{
        fontFamily: preset.fontFamily,
        fontSize: Math.round(preset.fontSize * 0.28),
        fontWeight: preset.fontWeight,
        color: preset.color,
        background,
        padding: `${preset.padding * 0.28}px ${preset.padding * 0.56}px`,
        borderRadius: preset.borderRadius * 0.5,
        textShadow: preset.stroke ? `0 0.5px 2px ${preset.strokeColor}` : undefined,
        letterSpacing: `${preset.letterSpacing}em`,
        textTransform: preset.uppercase ? "uppercase" : "none",
        maxWidth: "90%",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function KaraokeSample({ words, preset }: { words: string[]; preset: CaptionPreset }) {
  // Simulate word 2 being "active" in the preview
  const activeIndex = 1;
  const bg = preset.backgroundColor === "transparent"
    ? "transparent"
    : hexToRgba(preset.backgroundColor, preset.backgroundOpacity);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.2em",
        justifyContent: "center",
        fontFamily: preset.fontFamily,
        fontSize: Math.round(preset.fontSize * 0.28),
        fontWeight: preset.fontWeight,
        backgroundColor: bg,
        padding: `${preset.padding * 0.28}px ${preset.padding * 0.56}px`,
        borderRadius: preset.borderRadius * 0.5,
        maxWidth: "90%",
      }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            color: i === activeIndex ? preset.highlightColor : preset.color,
            fontWeight: i === activeIndex ? 900 : preset.fontWeight,
            textTransform: preset.uppercase ? "uppercase" : "none",
            letterSpacing: `${preset.letterSpacing}em`,
            transform: i === activeIndex ? "scale(1.08)" : "scale(1)",
            display: "inline-block",
            transition: "all 0.08s ease",
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
