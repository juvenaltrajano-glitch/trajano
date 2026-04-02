import React from "react";
import { Composition } from "remotion";
import { VideoComposition, VideoCompositionProps } from "./VideoComposition";
import { MOCK_PROJECT, PRESETS } from "@/lib/mock";
import { getKeptSegments } from "@/store/useProjectStore";

// Compute total frames for the mock project
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
  preset: PRESETS[MOCK_PROJECT.preset],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={Math.max(getMockTotalFrames(), 1)}
      fps={MOCK_PROJECT.fps}
      width={MOCK_PROJECT.width}
      height={MOCK_PROJECT.height}
      defaultProps={mockProps}
    />
  );
};
