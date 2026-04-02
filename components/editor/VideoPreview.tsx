"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { VideoComposition, VideoCompositionProps } from "@/remotion/VideoComposition";
import { useProjectStore, getTotalFrames } from "@/store/useProjectStore";
import { PRESETS } from "@/lib/mock";

export function VideoPreview() {
  const project = useProjectStore((s) => s.project);

  const totalFrames = useMemo(() => getTotalFrames(project), [project.segments, project.fps]);

  const inputProps: VideoCompositionProps = useMemo(
    () => ({
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
    [
      project.videoUrl, project.segments, project.captions, project.fps,
      project.format, project.sourceWidth, project.sourceHeight,
      project.preset, project.karaokeMode, project.effects, project.overlay,
    ]
  );

  const { format } = project;
  // Display width for the preview area — cap height at ~500px
  const maxH = 500;
  const maxW = 420;
  const scale = Math.min(maxW / format.width, maxH / format.height);
  const displayW = Math.round(format.width * scale);
  const displayH = Math.round(format.height * scale);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Format label */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{format.icon}</span>
        <span>{format.label} · {format.width}×{format.height}</span>
      </div>

      {/* Player */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5"
        style={{ width: displayW, height: displayH }}
      >
        <Player
          component={VideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
          compositionWidth={format.width}
          compositionHeight={format.height}
          durationInFrames={totalFrames}
          fps={project.fps}
          inputProps={inputProps as unknown as Record<string, unknown>}
          style={{ width: displayW, height: displayH }}
          controls
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  );
}
