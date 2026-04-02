"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore, getKeptDuration } from "@/store/useProjectStore";
import { PresetName } from "@/lib/types";
import { generateMockCaptions, PRESETS } from "@/lib/mock";
import { detectSilence } from "@/lib/silenceDetection";
import { FormatSelector } from "./FormatSelector";
import { clsx } from "clsx";

type Tab = "silence" | "captions" | "format" | "effects";

const TABS: { id: Tab; label: string }[] = [
  { id: "silence",  label: "Silence" },
  { id: "captions", label: "Captions" },
  { id: "format",   label: "Format" },
  { id: "effects",  label: "Effects" },
];

export function SettingsSidebar() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("captions");

  const project = useProjectStore((s) => s.project);
  const updateSilenceConfig = useProjectStore((s) => s.updateSilenceConfig);
  const updateEffects = useProjectStore((s) => s.updateEffects);
  const updateOverlay = useProjectStore((s) => s.updateOverlay);
  const setSegments = useProjectStore((s) => s.setSegments);
  const setCaptions = useProjectStore((s) => s.setCaptions);
  const setPreset = useProjectStore((s) => s.setPreset);
  const setKaraokeMode = useProjectStore((s) => s.setKaraokeMode);

  const { silenceConfig, effects, overlay, segments, duration, fps } = project;
  const keptDuration = getKeptDuration(project);

  async function handleReanalyze() {
    if (!project.file) return;
    const arrayBuffer = await project.file.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const newSegments = detectSilence(audioBuffer, silenceConfig);
    setSegments(newSegments);
    setCaptions(generateMockCaptions(newSegments.filter((s) => s.kind === "keep")));
    await audioCtx.close();
  }

  return (
    <aside className="flex flex-col h-full gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 mb-4 -mx-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {tab === "silence" && (
          <>
            <SliderField
              label="Silence Threshold"
              value={silenceConfig.threshold}
              min={-60} max={-20} step={1}
              format={(v) => `${v} dB`}
              onChange={(v) => updateSilenceConfig({ threshold: v })}
            />
            <SliderField
              label="Min silence duration"
              value={silenceConfig.minDuration}
              min={100} max={2000} step={100}
              format={(v) => `${v} ms`}
              onChange={(v) => updateSilenceConfig({ minDuration: v })}
            />
            <SliderField
              label="Padding"
              value={silenceConfig.padding}
              min={0} max={500} step={50}
              format={(v) => `${v} ms`}
              onChange={(v) => updateSilenceConfig({ padding: v })}
            />
            <button
              onClick={handleReanalyze}
              disabled={!project.file}
              className={clsx(
                "w-full py-2 rounded-lg text-sm font-medium transition-colors",
                project.file
                  ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              Re-analyze Audio
            </button>
          </>
        )}

        {tab === "captions" && (
          <>
            {/* Karaoke toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-200 font-medium">Karaoke Mode</div>
                <div className="text-xs text-zinc-500 mt-0.5">Word-by-word highlight</div>
              </div>
              <button
                onClick={() => setKaraokeMode(!project.karaokeMode)}
                className={clsx(
                  "w-10 h-6 rounded-full transition-colors relative shrink-0",
                  project.karaokeMode ? "bg-emerald-500" : "bg-zinc-700"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                    project.karaokeMode ? "left-5" : "left-1"
                  )}
                />
              </button>
            </div>

            {/* Preset grid */}
            <div>
              <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                Caption Style
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(PRESETS) as PresetName[]).map((name) => (
                  <PresetCard
                    key={name}
                    name={name}
                    isActive={project.preset === name}
                    onClick={() => setPreset(name)}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() =>
                setCaptions(generateMockCaptions(segments.filter((s) => s.kind === "keep")))
              }
              className="w-full py-2 rounded-lg text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition-colors"
            >
              Generate Captions
            </button>
          </>
        )}

        {tab === "format" && (
          <>
            <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">
              Output Format
            </div>
            <FormatSelector />
            <div className="text-xs text-zinc-600 pt-1">
              Current: {project.format.width}×{project.format.height} · {project.format.sublabel}
            </div>
          </>
        )}

        {tab === "effects" && (
          <>
            <ToggleField
              label="Zoom In"
              description="Subtle zoom on video entry"
              value={effects.zoom}
              onChange={(v) => updateEffects({ zoom: v })}
            />
            {effects.zoom && (
              <SliderField
                label="Zoom scale"
                value={effects.zoomScale}
                min={1.0} max={1.3} step={0.01}
                format={(v) => `${Math.round((v - 1) * 100)}%`}
                onChange={(v) => updateEffects({ zoomScale: v })}
              />
            )}
            <ToggleField
              label="Ken Burns"
              description="Slow pan + zoom across segment"
              value={effects.kenBurns}
              onChange={(v) => updateEffects({ kenBurns: v })}
            />
            <ToggleField
              label="Background Blur"
              description="Blurred video fills letterbox areas"
              value={overlay.showBackground}
              onChange={(v) => updateOverlay({ showBackground: v })}
            />
            <ToggleField
              label="Progress Bar"
              description="Watch-time indicator overlay"
              value={overlay.progressBar}
              onChange={(v) => updateOverlay({ progressBar: v })}
            />
            {overlay.progressBar && (
              <>
                <ColorField
                  label="Bar color"
                  value={overlay.progressBarColor}
                  onChange={(v) => updateOverlay({ progressBarColor: v })}
                />
                <div className="flex gap-2">
                  {(["top", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => updateOverlay({ progressBarPosition: pos })}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                        overlay.progressBarPosition === pos
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Export footer — always visible */}
      <div className="pt-4 mt-4 border-t border-zinc-800 space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Output</span>
          <span className="text-emerald-400 font-medium">{keptDuration.toFixed(1)}s</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Removed</span>
          <span className="text-zinc-400">{(duration - keptDuration).toFixed(1)}s</span>
        </div>
        <button
          onClick={() => router.push("/export")}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors mt-1"
        >
          Export →
        </button>
      </div>
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SliderField({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-300">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500 cursor-pointer"
      />
    </div>
  );
}

function ToggleField({
  label, description, value, onChange,
}: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          "w-10 h-6 rounded-full transition-colors relative shrink-0",
          value ? "bg-emerald-500" : "bg-zinc-700"
        )}
      >
        <span
          className={clsx(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
            value ? "left-5" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
      />
    </div>
  );
}

function PresetCard({
  name, isActive, onClick,
}: {
  name: PresetName; isActive: boolean; onClick: () => void;
}) {
  const preset = PRESETS[name];
  const bgColor = preset.backgroundColor === "transparent"
    ? "transparent"
    : `${preset.backgroundColor}${Math.round(preset.backgroundOpacity * 255).toString(16).padStart(2, "0")}`;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
        isActive
          ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500"
          : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
      )}
    >
      {/* Mini preview */}
      <div
        style={{
          width: 60,
          height: 34,
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          borderRadius: 4,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 4,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: preset.fontFamily,
            fontSize: 7,
            fontWeight: preset.fontWeight,
            color: preset.color,
            backgroundColor: bgColor,
            padding: "1px 4px",
            borderRadius: 2,
            WebkitTextStroke: preset.stroke ? `0.5px ${preset.strokeColor}` : undefined,
            letterSpacing: `${preset.letterSpacing}em`,
            textTransform: preset.uppercase ? "uppercase" : "none",
          }}
        >
          {preset.uppercase ? "CAPTION" : "Caption"}
        </span>
      </div>

      <div className="text-left">
        <div className={clsx("text-sm font-medium", isActive ? "text-emerald-300" : "text-zinc-200")}>
          {preset.label}
        </div>
        <div className="text-xs text-zinc-500 capitalize">
          {preset.animation} · {preset.position}
        </div>
      </div>

      {isActive && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}
