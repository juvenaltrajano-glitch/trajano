"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore, getKeptDuration } from "@/store/useProjectStore";
import { PRESETS } from "@/lib/mock";

type RenderState = "idle" | "loading" | "done" | "error";

export function ExportPanel() {
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const keptDuration = getKeptDuration(project);

  const [state, setState] = useState<RenderState>("idle");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function handleRender() {
    setState("loading");
    setProgress(0);
    setError(null);

    // Simulate render progress (0→95% in ~2.5s, jumps to 100% when done)
    const startTime = Date.now();
    const duration = 2500;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(95, Math.round((elapsed / duration) * 95));
      setProgress(p);
    }, 50);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoSrc: project.videoUrl ?? "/mock-video.mp4",
          segments: project.segments,
          captions: project.captions,
          fps: project.fps,
          format: project.format,
          sourceWidth: project.sourceWidth,
          sourceHeight: project.sourceHeight,
          preset: PRESETS[project.preset],
          karaokeMode: project.karaokeMode,
          effects: project.effects,
          overlay: project.overlay,
        }),
      });

      const data = await res.json();

      clearInterval(progressInterval);

      if (!res.ok) throw new Error(data.error ?? "Render failed");

      setProgress(100);
      setOutputUrl(data.outputUrl);
      setState("done");
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  return (
    <div className="max-w-lg w-full space-y-8">
      {/* Stats */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Export Summary
          </h2>
        </div>
        <div className="divide-y divide-zinc-800">
          <StatRow label="Original duration" value={`${project.duration.toFixed(1)}s`} />
          <StatRow
            label="Output duration"
            value={`${keptDuration.toFixed(1)}s`}
            highlight
          />
          <StatRow
            label="Time removed"
            value={`${(project.duration - keptDuration).toFixed(1)}s`}
          />
          <StatRow label="Caption style" value={project.preset} />
          <StatRow label="Format" value={project.format.label} />
          <StatRow label="Resolution" value={`${project.format.width}×${project.format.height}`} />
          <StatRow label="FPS" value={String(project.fps)} />
        </div>
      </div>

      {/* Render controls */}
      <div className="space-y-4">
        {state === "idle" && (
          <button
            onClick={handleRender}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Start Render
          </button>
        )}

        {state === "loading" && (
          <div className="space-y-3">
            <div className="w-full py-3.5 rounded-xl bg-zinc-800 text-zinc-400 font-semibold flex items-center justify-center gap-3">
              <Spinner />
              Rendering… {progress}%
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {state === "done" && outputUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Render complete
            </div>
            <a
              href={outputUrl}
              download="edited-video.mp4"
              className="block w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-center transition-colors"
            >
              Download MP4
            </a>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-400 text-sm">
              {error}
            </div>
            <button
              onClick={handleRender}
              className="w-full py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <button
          onClick={() => router.push("/editor")}
          className="w-full py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
        >
          ← Back to Editor
        </button>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between px-6 py-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? "text-emerald-400 font-medium" : "text-zinc-200"}>
        {value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
