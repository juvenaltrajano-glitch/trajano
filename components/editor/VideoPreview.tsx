"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { VideoComposition, VideoCompositionProps } from "@/remotion/VideoComposition";
import { useProjectStore, getKeptSegments } from "@/store/useProjectStore";
import { PRESETS } from "@/lib/mock";

export function VideoPreview() {
  const project = useProjectStore((s) => s.project);

  // Compute total frames inline
  const totalFrames = useMemo(() => {
    const kept = getKeptSegments(project);
    const frames = kept.reduce(
      (sum, s) => sum + Math.round((s.endTime - s.startTime) * project.fps),
      0
    );
    return Math.max(frames, 1);
  }, [project.segments, project.fps]);

  const inputProps: VideoCompositionProps = useMemo(
    () => ({
      videoSrc: project.videoUrl ?? "/mock-video.mp4",
      segments: project.segments,
      captions: project.captions,
      fps: project.fps,
      preset: PRESETS[project.preset],
    }),
    [project.videoUrl, project.segments, project.captions, project.fps, project.preset]
  );

  return (
    <div className="w-full rounded-xl overflow-hidden bg-black shadow-2xl">
      <Player
        component={VideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
        compositionWidth={project.width}
        compositionHeight={project.height}
        durationInFrames={totalFrames}
        fps={project.fps}
        inputProps={inputProps}
        style={{ width: "100%", aspectRatio: `${project.width}/${project.height}` }}
        controls
        acknowledgeRemotionLicense
      />
    </div>
  );
}
