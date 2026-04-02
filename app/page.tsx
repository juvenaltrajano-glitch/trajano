"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/upload/DropZone";
import { useProjectStore } from "@/store/useProjectStore";
import { detectSilence } from "@/lib/silenceDetection";
import { generateMockCaptions } from "@/lib/mock";

type Step = "idle" | "analyzing" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const { setFile, setSegments, setCaptions, loadMock } = useProjectStore();
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const silenceConfig = useProjectStore((s) => s.project.silenceConfig);

  async function handleFileAccepted(file: File) {
    setStep("analyzing");
    setErrorMsg("");

    try {
      // Extract video metadata via a temporary <video> element
      const videoUrl = URL.createObjectURL(file);
      const { duration, fps, width, height } = await getVideoMeta(videoUrl);

      setFile(file, videoUrl, duration, fps, width, height);
      setProgress("Decoding audio…");

      // Decode audio for silence detection
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();

      setProgress("Detecting silence…");
      const segments = detectSilence(audioBuffer, silenceConfig);
      setSegments(segments);

      const kept = segments.filter((s) => s.kind === "keep");
      setCaptions(generateMockCaptions(kept));

      setStep("done");
      router.push("/editor");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to process file.");
      setStep("error");
    }
  }

  function handleUseMock() {
    loadMock();
    router.push("/editor");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Video Editor</h1>
          <p className="text-zinc-400 text-sm">
            Upload a video · remove pauses · add captions · export
          </p>
        </div>

        {/* Upload area */}
        <DropZone onFileAccepted={handleFileAccepted} isProcessing={step === "analyzing"} />

        {/* Processing status */}
        {step === "analyzing" && (
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Spinner />
            {progress || "Processing…"}
          </div>
        )}

        {step === "error" && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        {/* Demo shortcut */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <button
          onClick={handleUseMock}
          className="w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
        >
          Use Demo Video
        </button>
      </div>
    </main>
  );
}

// Extract duration, approx fps, and dimensions from a video URL
function getVideoMeta(url: string): Promise<{ duration: number; fps: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        fps: 30, // browsers don't expose fps; default to 30
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
      });
    };
    video.onerror = () => reject(new Error("Could not read video metadata."));
    video.src = url;
  });
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
