import React from "react";
import { Composition } from "remotion";
import { VideoComposition, VideoCompositionProps } from "./VideoComposition";
import { MOCK_PROJECT, PRESETS } from "@/lib/mock";
import { getKeptSegments } from "@/store/useProjectStore";

function getMockTotalFrames(): number {
  const kept = getKeptSegments(MOCK_PROJECT);
  return kept.reduce(
    (sum, s) => sum + Math.round((s.endTime - s.startTime) * MOCK_PROJECT.fps),
    0
  );
}

const mockProps: VideoCompositionProps = {
  videoSrc: MOCK_PROJECT.videoUrl ?? "/mock-video.mp4",
  segments: MOCK_PROJECT.segments,
  captions: MOCK_PROJECT.captions,
  fps: MOCK_PROJECT.fps,
  format: MOCK_PROJECT.format,
  sourceWidth: MOCK_PROJECT.sourceWidth,
  sourceHeight: MOCK_PROJECT.sourceHeight,
  preset: PRESETS[MOCK_PROJECT.preset],
  karaokeMode: MOCK_PROJECT.karaokeMode,
  effects: MOCK_PROJECT.effects,
  overlay: MOCK_PROJECT.overlay,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={Math.max(getMockTotalFrames(), 1)}
      fps={MOCK_PROJECT.fps}
      width={MOCK_PROJECT.format.width}
      height={MOCK_PROJECT.format.height}
      defaultProps={mockProps as unknown as Record<string, unknown>}
    />
  );
};
