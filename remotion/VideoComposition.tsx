import React from "react";
import {
  AbsoluteFill, OffthreadVideo, Sequence,
  interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { Caption, CaptionPreset, OverlayConfig, Segment, VideoEffect, VideoFormat } from "@/lib/types";
import { CaptionLayer } from "./CaptionLayer";
import { VideoBackground } from "./VideoBackground";
import { ProgressBar } from "./ProgressBar";

export interface VideoCompositionProps {
  videoSrc: string;
  segments: Segment[];
  captions: Caption[];
  fps: number;
  format: VideoFormat;
  sourceWidth: number;
  sourceHeight: number;
  preset: CaptionPreset;
  karaokeMode: boolean;
  effects: VideoEffect;
  overlay: OverlayConfig;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  videoSrc,
  segments,
  captions,
  fps,
  format,
  sourceWidth,
  sourceHeight,
  preset,
  karaokeMode,
  effects,
  overlay,
}) => {
  // Build sequenced segments with inline frame math
  let frameOffset = 0;
  let trimmedTime = 0;

  const sequenced = segments
    .filter((s) => s.kind === "keep")
    .map((s) => {
      const startFrom = Math.round(s.startTime * fps);
      const durationInFrames = Math.max(1, Math.round((s.endTime - s.startTime) * fps));
      const offset = frameOffset;
      const segTrimmedStart = trimmedTime;

      frameOffset += durationInFrames;
      trimmedTime += s.endTime - s.startTime;

      return { ...s, startFrom, durationInFrames, offset, segTrimmedStart };
    });

  // Determine if we need letterbox background (source doesn't match output format)
  const sourceAspect = sourceWidth / sourceHeight;
  const outputAspect = format.width / format.height;
  const needsBackground = overlay.showBackground && Math.abs(sourceAspect - outputAspect) > 0.05;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sequenced.map((s) => {
        const segCaptions = captions.filter(
          (c) =>
            c.startTime >= s.segTrimmedStart &&
            c.startTime < s.segTrimmedStart + (s.endTime - s.startTime)
        );

        return (
          <Sequence key={s.id} from={s.offset} durationInFrames={s.durationInFrames}>
            <SegmentLayer
              src={videoSrc}
              startFrom={s.startFrom}
              durationInFrames={s.durationInFrames}
              needsBackground={needsBackground}
              effects={effects}
              captions={segCaptions}
              segTrimmedStart={s.segTrimmedStart}
              fps={fps}
              preset={preset}
              karaokeMode={karaokeMode}
            />
          </Sequence>
        );
      })}

      {/* Global progress bar sits above all sequences */}
      {overlay.progressBar && <ProgressBar overlay={overlay} />}
    </AbsoluteFill>
  );
};

// ─── Per-segment layer ────────────────────────────────────────────────────────

interface SegmentLayerProps {
  src: string;
  startFrom: number;
  durationInFrames: number;
  needsBackground: boolean;
  effects: VideoEffect;
  captions: Caption[];
  segTrimmedStart: number;
  fps: number;
  preset: CaptionPreset;
  karaokeMode: boolean;
}

const SegmentLayer: React.FC<SegmentLayerProps> = ({
  src,
  startFrom,
  durationInFrames,
  needsBackground,
  effects,
  captions,
  segTrimmedStart,
  fps,
  preset,
  karaokeMode,
}) => {
  const frame = useCurrentFrame();
  const { fps: compFps } = useVideoConfig();

  // Ken Burns: slow zoom + subtle drift over the segment duration
  let videoScale = 1;
  let videoTranslateX = 0;
  let videoTranslateY = 0;

  if (effects.kenBurns) {
    videoScale = interpolate(frame, [0, durationInFrames], [1, 1.08]);
    videoTranslateX = interpolate(frame, [0, durationInFrames], [0, -1.5]);
    videoTranslateY = interpolate(frame, [0, durationInFrames], [0, -1]);
  } else if (effects.zoom) {
    // Static zoom with spring entrance
    const springVal = spring({ frame, fps: compFps, config: { damping: 100, stiffness: 80 } });
    videoScale = interpolate(springVal, [0, 1], [1, effects.zoomScale]);
  }

  // Segment entrance: subtle fade-in on first 4 frames
  const segOpacity = interpolate(frame, [0, 4], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${videoScale}) translate(${videoTranslateX}%, ${videoTranslateY}%)`,
    opacity: segOpacity,
    willChange: "transform",
  };

  return (
    <AbsoluteFill>
      {/* Blurred background fills letterbox for non-matching aspect ratios */}
      {needsBackground && <VideoBackground src={src} startFrom={startFrom} />}

      {/* Main video */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={src}
          startFrom={startFrom}
          endAt={startFrom + durationInFrames}
          style={videoStyle}
        />
      </AbsoluteFill>

      {/* Captions */}
      <CaptionLayer
        captions={captions}
        segTrimmedStart={segTrimmedStart}
        fps={fps}
        preset={preset}
        karaokeMode={karaokeMode}
      />
    </AbsoluteFill>
  );
};
