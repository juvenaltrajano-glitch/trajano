"use client";

import { useRouter } from "next/navigation";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { SegmentTimeline } from "@/components/editor/SegmentTimeline";
import { CaptionPreview } from "@/components/editor/CaptionPreview";
import { SettingsSidebar } from "@/components/editor/SettingsSidebar";
import { SuggestionBar } from "@/components/editor/SuggestionBar";

export default function EditorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => router.push("/")}
          className="text-zinc-500 hover:text-zinc-200 text-sm transition-colors"
        >
          ← Upload
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-sm font-semibold text-zinc-300">AI Video Editor</h1>
        </div>
        <button
          onClick={() => router.push("/export")}
          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Export →
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: preview area */}
        <main className="flex-1 flex flex-col gap-5 p-6 min-w-0 overflow-y-auto">
          <VideoPreview />
          <SegmentTimeline />
          <div className="grid grid-cols-2 gap-4">
            <CaptionPreview />
            <SuggestionBar />
          </div>
        </main>

        {/* Right: settings sidebar */}
        <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900/30 p-5 overflow-y-auto flex flex-col">
          <SettingsSidebar />
        </aside>
      </div>
    </div>
  );
}
