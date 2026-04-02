"use client";

import { useRouter } from "next/navigation";
import { useProjectStore, getKeptDuration } from "@/store/useProjectStore";
import { PresetName } from "@/lib/types";
import { generateMockCaptions, PRESETS } from "@/lib/mock";
import { detectSilence } from "@/lib/silenceDetection";
import { clsx } from "clsx";

export function SettingsSidebar() {
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const updateSilenceConfig = useProjectStore((s) => s.updateSilenceConfig);
  const setSegments = useProjectStore((s) => s.setSegments);
  const setCaptions = useProjectStore((s) => s.setCaptions);
  const setPreset = useProjectStore((s) => s.setPreset);

  const { silenceConfig, segments, duration, fps } = project;
  const keptDuration = getKeptDuration(project);

  async function handleReanalyze() {
    if (!project.file) return;
    const arrayBuffer = await project.file.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const newSegments = detectSilence(audioBuffer, silenceConfig);
    setSegments(newSegments);
    const kept = newSegments.filter((s) => s.kind === "keep");
    setCaptions(generateMockCaptions(kept));
    await audioCtx.close();
  }

  function handleGenerateCaptions() {
    const kept = segments.filter((s) => s.kind === "keep");
    setCaptions(generateMockCaptions(kept));
  }

  return (
    <aside className="flex flex-col gap-6 h-full overflow-y-auto">
      {/* Silence Detection */}
      <Section title="Silence Detection">
        <SliderField
          label="Threshold"
          value={silenceConfig.threshold}
          min={-60}
          max={-20}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => updateSilenceConfig({ threshold: v })}
        />
        <SliderField
          label="Min duration"
          value={silenceConfig.minDuration}
          min={100}
          max={2000}
          step={100}
          format={(v) => `${v} ms`}
          onChange={(v) => updateSilenceConfig({ minDuration: v })}
        />
        <SliderField
          label="Padding"
          value={silenceConfig.padding}
          min={0}
          max={500}
          step={50}
          format={(v) => `${v} ms`}
          onChange={(v) => updateSilenceConfig({ padding: v })}
        />
        <button
          onClick={handleReanalyze}
          disabled={!project.file}
          className={clsx(
            "w-full mt-1 py-2 rounded-lg text-sm font-medium transition-colors",
            project.file
              ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          )}
        >
          Re-analyze
        </button>
      </Section>

      {/* Caption Style */}
      <Section title="Caption Style">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PRESETS) as PresetName[]).map((name) => (
            <PresetCard
              key={name}
              name={name}
              isActive={project.preset === name}
              onClick={() => setPreset(name)}
            />
          ))}
        </div>
        <button
          onClick={handleGenerateCaptions}
          className="w-full mt-2 py-2 rounded-lg text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition-colors"
        >
          Generate Captions
        </button>
      </Section>

      {/* Export */}
      <Section title="Export">
        <div className="text-sm text-zinc-400 space-y-1">
          <div className="flex justify-between">
            <span>Original</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Output</span>
            <span className="text-emerald-400">{keptDuration.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Removed</span>
            <span className="text-red-400">{(duration - keptDuration).toFixed(1)}s</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/export")}
          className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          Go to Export →
        </button>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500 cursor-pointer"
      />
    </div>
  );
}

function PresetCard({
  name,
  isActive,
  onClick,
}: {
  name: PresetName;
  isActive: boolean;
  onClick: () => void;
}) {
  const preset = PRESETS[name];

  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative h-16 rounded-lg border transition-all overflow-hidden flex items-end justify-center p-1.5",
        isActive
          ? "border-emerald-500 ring-1 ring-emerald-500"
          : "border-zinc-700 hover:border-zinc-500"
      )}
      style={{ background: "linear-gradient(135deg, #1e1e2e 0%, #2a2a3a 100%)" }}
    >
      <span
        style={{
          fontFamily: preset.fontFamily,
          fontSize: 9,
          fontWeight: preset.fontWeight,
          color: preset.color,
          backgroundColor:
            preset.backgroundColor === "transparent"
              ? "transparent"
              : `${preset.backgroundColor}${Math.round(preset.backgroundOpacity * 255).toString(16).padStart(2, "0")}`,
          padding: "1px 4px",
          borderRadius: 2,
          textShadow:
            preset.backgroundColor === "transparent"
              ? "0 1px 2px rgba(0,0,0,1)"
              : "none",
        }}
      >
        {name}
      </span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}
