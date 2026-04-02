"use client";

import { useRouter } from "next/navigation";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { SegmentTimeline } from "@/components/editor/SegmentTimeline";
import { CaptionPreview } from "@/components/editor/CaptionPreview";
import { SettingsSidebar } from "@/components/editor/SettingsSidebar";

export default function EditorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => router.push("/")}
          className="text-zinc-500 hover:text-zinc-200 text-sm transition-colors"
        >
          ← Upload
        </button>
        <h1 className="text-sm font-semibold text-zinc-300">AI Video Editor</h1>
        <button
          onClick={() => router.push("/export")}
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Export →
        </button>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video + Timeline + Caption preview */}
        <main className="flex-1 flex flex-col gap-5 p-6 min-w-0 overflow-y-auto">
          <VideoPreview />
          <SegmentTimeline />
          <CaptionPreview />
        </main>

        {/* Right: Settings sidebar */}
        <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900/40 p-5 overflow-y-auto">
          <SettingsSidebar />
        </aside>
      </div>
    </div>
  );
}
