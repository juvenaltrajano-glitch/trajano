"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/upload/DropZone";
import { useProjectStore } from "@/store/useProjectStore";
import { detectSilence } from "@/lib/silenceDetection";
import { generateMockCaptions } from "@/lib/mock";
import { createClip } from "@/lib/clips";
import { clsx } from "clsx";

interface ProcessingState {
  fileName: string;
  status: "queued" | "processing" | "done" | "error";
  message: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { setFile, setSegments, setCaptions, addClip, loadMock } = useProjectStore();
  const clips = useProjectStore((s) => s.project.clips);
  const silenceConfig = useProjectStore((s) => s.project.silenceConfig);

  const [processing, setProcessing] = useState<ProcessingState[]>([]);
  const [globalError, setGlobalError] = useState("");

  async function processFile(file: File, clipOrder: number): Promise<void> {
    setProcessing((prev) =>
      prev.map((p) =>
        p.fileName === file.name ? { ...p, status: "processing", message: "Decoding audio…" } : p
      )
    );

    const videoUrl = URL.createObjectURL(file);
    const { duration, fps, width, height } = await getVideoMeta(videoUrl);

    // First file also sets the "single clip" fallback state
    if (clipOrder === 0) {
      setFile(file, videoUrl, duration, fps, width, height);
    }

    setProcessing((prev) =>
      prev.map((p) =>
        p.fileName === file.name ? { ...p, message: "Detecting silence…" } : p
      )
    );

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    const segments = detectSilence(audioBuffer, silenceConfig);
    const kept = segments.filter((s) => s.kind === "keep");

    if (clipOrder === 0) {
      setSegments(segments);
      setCaptions(generateMockCaptions(kept));
    }

    const clip = createClip(file, videoUrl, duration, fps, width, height, segments, clipOrder);
    addClip(clip);

    setProcessing((prev) =>
      prev.map((p) =>
        p.fileName === file.name ? { ...p, status: "done", message: `${kept.length} segments kept` } : p
      )
    );
  }

  async function handleFilesAccepted(files: File[]) {
    setGlobalError("");
    // Always start order from 0 — processFile(file, 0) calls setFile() which clears old clips
    setProcessing((prev) => [
      ...prev,
      ...files.map((f) => ({ fileName: f.name, status: "queued" as const, message: "Waiting…" })),
    ]);

    // Process sequentially to avoid AudioContext overload
    for (let i = 0; i < files.length; i++) {
      try {
        await processFile(files[i], i);
      } catch (err) {
        setProcessing((prev) =>
          prev.map((p) =>
            p.fileName === files[i].name
              ? { ...p, status: "error", message: err instanceof Error ? err.message : "Failed" }
              : p
          )
        );
      }
    }
  }

  function handleUseMock() {
    loadMock();
    router.push("/editor");
  }

  const allDone = processing.length > 0 && processing.every((p) => p.status === "done" || p.status === "error");
  const isProcessing = processing.some((p) => p.status === "processing" || p.status === "queued");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-zinc-950">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Video Editor</h1>
          <p className="text-zinc-400 text-sm">
            Upload one or more clips · remove pauses · add captions · export
          </p>
          <p className="text-zinc-700 text-xs font-mono">
            v0.1 · build 2026-04-02T18:30Z
          </p>
        </div>

        {/* Drop zone */}
        <DropZone
          onFilesAccepted={handleFilesAccepted}
          isProcessing={isProcessing}
          multiple
        />

        {/* Processing queue */}
        {processing.length > 0 && (
          <div className="space-y-2">
            {processing.map((p) => (
              <div
                key={p.fileName}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm",
                  p.status === "done"  && "border-emerald-800 bg-emerald-950/20 text-emerald-300",
                  p.status === "error" && "border-red-800 bg-red-950/20 text-red-400",
                  (p.status === "processing" || p.status === "queued") && "border-zinc-700 bg-zinc-900 text-zinc-300"
                )}
              >
                {p.status === "processing" && <Spinner />}
                {p.status === "done"  && <span>✓</span>}
                {p.status === "error" && <span>✗</span>}
                {p.status === "queued" && <span className="text-zinc-600">○</span>}
                <span className="flex-1 truncate font-medium">{p.fileName}</span>
                <span className="text-xs opacity-70 shrink-0">{p.message}</span>
              </div>
            ))}
          </div>
        )}

        {globalError && <p className="text-red-400 text-sm">{globalError}</p>}

        {/* Go to editor once files are processed */}
        {allDone && (
          <button
            onClick={() => router.push("/editor")}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Open Editor →
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <button
          onClick={handleUseMock}
          className="w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
        >
          Use Demo Video (3 clips with transitions)
        </button>
      </div>
    </main>
  );
}

function getVideoMeta(url: string): Promise<{ duration: number; fps: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      resolve({ duration: video.duration, fps: 30, width: video.videoWidth || 1920, height: video.videoHeight || 1080 });
    video.onerror = () => reject(new Error("Could not read video metadata."));
    video.src = url;
  });
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
