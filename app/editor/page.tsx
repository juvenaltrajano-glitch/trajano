"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { SegmentTimeline } from "@/components/editor/SegmentTimeline";
import { CaptionPreview } from "@/components/editor/CaptionPreview";
import { SettingsSidebar } from "@/components/editor/SettingsSidebar";
import { ClipManager } from "@/components/editor/ClipManager";
import { AISuggestionsPanel } from "@/components/editor/AISuggestionsPanel";
import { useProjectStore, getSortedClips } from "@/store/useProjectStore";
import { buildSuggestRequest, generateMockSuggestions } from "@/lib/aiSuggestions";

export default function EditorPage() {
  const router = useRouter();
  const project = useProjectStore((s) => s.project);
  const clips = getSortedClips(project);
  const setSuggestions = useProjectStore((s) => s.setSuggestions);
  const setSuggestionsLoading = useProjectStore((s) => s.setSuggestionsLoading);

  // Auto-fetch AI suggestions when clips change
  useEffect(() => {
    if (clips.length === 0) return;

    const run = async () => {
      setSuggestionsLoading(true);
      try {
        const payload = buildSuggestRequest(clips, project.format.label, project.preset);
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 501) {
          // No API key — use local mock
          setSuggestions(generateMockSuggestions(clips));
        } else if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        setSuggestions(generateMockSuggestions(clips));
      } finally {
        setSuggestionsLoading(false);
      }
    };

    run();
  }, [clips.length]); // re-run when clip count changes

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
          <span className="text-sm font-semibold text-zinc-300">AI Video Editor</span>
          {clips.length > 0 && (
            <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
              {clips.length} clip{clips.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => router.push("/export")}
          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Export →
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Clip list + AI suggestions */}
        <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-900/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex flex-col min-h-0" style={{ maxHeight: "45%" }}>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Clips</h2>
              <button
                onClick={() => router.push("/")}
                className="text-[11px] text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                + Add clip
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              <ClipManager />
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <AISuggestionsPanel />
          </div>
        </aside>

        {/* Centre: Preview + Timeline + Caption */}
        <main className="flex-1 flex flex-col gap-5 p-6 min-w-0 overflow-y-auto">
          <VideoPreview />
          <SegmentTimeline />
          <CaptionPreview />
        </main>

        {/* Right: Settings sidebar */}
        <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900/30 p-5 overflow-y-auto flex flex-col">
          <SettingsSidebar />
        </aside>
      </div>
    </div>
  );
}
