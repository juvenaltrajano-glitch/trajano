"use client";

import { ExportPanel } from "@/components/export/ExportPanel";

export default function ExportPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Export Video</h1>
          <p className="text-zinc-500 text-sm">Render your edited video with Remotion</p>
        </div>
        <ExportPanel />
      </div>
    </div>
  );
}
