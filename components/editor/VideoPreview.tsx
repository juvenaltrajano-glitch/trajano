"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { VideoComposition, VideoCompositionProps } from "@/remotion/VideoComposition";
import { useProjectStore, getTotalFrames, getSortedClips } from "@/store/useProjectStore";
import { PRESETS } from "@/lib/mock";

export function VideoPreview() {
  const project = useProjectStore((s) => s.project);
  const sortedClips = getSortedClips(project);

  // Total frames from real clips or single-clip segments
  const totalFrames = useMemo(() => {
    const fromClips = sortedClips
      .filter((c) => c.videoUrl?.startsWith("blob:"))
      .reduce(
        (sum, c) =>
          sum +
          c.segments
            .filter((s) => s.kind === "keep")
            .reduce((cs, s) => cs + Math.round((s.endTime - s.startTime) * project.fps), 0),
        0
      );
    if (fromClips > 0) return fromClips;
    const fromSingle = getTotalFrames(project);
    // Fall back to a 5s placeholder if nothing real is loaded yet
    return fromSingle > 0 ? fromSingle : project.fps * 5;
  }, [sortedClips, project.segments, project.fps]);

  const inputProps: VideoCompositionProps = useMemo(
    () => ({
      // Pass clips only if they have real blob sources
      clips: sortedClips.some((c) => c.videoUrl?.startsWith("blob:")) ? sortedClips : [],
      videoSrc: project.videoUrl ?? undefined,
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
      sortedClips, project.videoUrl, project.segments, project.captions, project.fps,
      project.format, project.sourceWidth, project.sourceHeight,
      project.preset, project.karaokeMode, project.effects, project.overlay,
    ]
  );

  const { format } = project;
  const maxH = 500;
  const maxW = 420;
  const scale = Math.min(maxW / format.width, maxH / format.height);
  const displayW = Math.round(format.width * scale);
  const displayH = Math.round(format.height * scale);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{format.icon}</span>
        <span>{format.label} · {format.width}×{format.height}</span>
        {!project.videoUrl && (
          <span className="text-zinc-700">— upload a video to preview</span>
        )}
      </div>

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
