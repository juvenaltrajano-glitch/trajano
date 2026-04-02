import React from "react";
import {
  AbsoluteFill, Video, Sequence,
  interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";

import { Caption, CaptionPreset, Clip, OverlayConfig, Segment, VideoEffect, VideoFormat } from "@/lib/types";
import { CaptionLayer } from "./CaptionLayer";
import { VideoBackground } from "./VideoBackground";
import { ProgressBar } from "./ProgressBar";

export interface VideoCompositionProps {
  clips?: Clip[];
  videoSrc?: string;
  segments?: Segment[];
  captions?: Caption[];
  fps: number;
  format: VideoFormat;
  sourceWidth: number;
  sourceHeight: number;
  preset: CaptionPreset;
  karaokeMode: boolean;
  effects: VideoEffect;
  overlay: OverlayConfig;
}

// A real video src is one that is a blob: URL or a served path (not the mock placeholder)
function isRealVideo(src: string | null | undefined): boolean {
  if (!src) return false;
  return src.startsWith("blob:") || (src.startsWith("/") && src !== "/mock-video.mp4");
}

export const VideoComposition: React.FC<VideoCompositionProps> = (props) => {
  const { clips, fps, format, sourceWidth, sourceHeight, preset, karaokeMode, effects, overlay } = props;

  const sortedClips = clips && clips.length > 0
    ? [...clips].sort((a, b) => a.order - b.order)
    : null;

  // Use multi-clip path only when clips have real video sources
  const realClips = sortedClips?.filter((c) => isRealVideo(c.videoUrl)) ?? null;
  const useMultiClip = realClips && realClips.length > 0;

  const sourceAspect = sourceWidth / sourceHeight;
  const outputAspect = format.width / format.height;
  const needsBackground = overlay.showBackground && Math.abs(sourceAspect - outputAspect) > 0.05;

  const singleSrc = props.videoSrc;
  const singleIsReal = isRealVideo(singleSrc);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {useMultiClip ? (
        <MultiClipComposition
          clips={realClips!}
          fps={fps}
          needsBackground={needsBackground}
          preset={preset}
          karaokeMode={karaokeMode}
          effects={effects}
        />
      ) : singleIsReal ? (
        <SingleClipComposition
          videoSrc={singleSrc!}
          segments={props.segments ?? []}
          captions={props.captions ?? []}
          fps={fps}
          needsBackground={needsBackground}
          preset={preset}
          karaokeMode={karaokeMode}
          effects={effects}
        />
      ) : (
        // No real video yet — show animated gradient placeholder with captions
        <PlaceholderComposition
          captions={props.captions ?? []}
          fps={fps}
          preset={preset}
          karaokeMode={karaokeMode}
        />
      )}

      {overlay.progressBar && <ProgressBar overlay={overlay} />}
    </AbsoluteFill>
  );
};

// ─── Gradient placeholder (demo / no video uploaded yet) ─────────────────────

interface PlaceholderProps {
  captions: Caption[];
  fps: number;
  preset: CaptionPreset;
  karaokeMode: boolean;
}

const PlaceholderComposition: React.FC<PlaceholderProps> = ({ captions, fps, preset, karaokeMode }) => {
  const frame = useCurrentFrame();
  // Animate hue slowly and keep lightness high enough to be clearly visible
  const hue = interpolate(frame, [0, 300], [240, 300], { extrapolateRight: "wrap" });
  const pulse = Math.sin(frame / 25) * 0.5 + 0.5; // 0..1

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, hsl(${hue},55%,20%) 0%, hsl(${hue + 50},65%,30%) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Animated glow rings */}
      <div style={{
        position: "absolute",
        width: "45%",
        aspectRatio: "1",
        borderRadius: "50%",
        border: `1.5px solid rgba(255,255,255,${0.12 + pulse * 0.1})`,
        transform: `scale(${1 + Math.sin(frame / 30) * 0.06})`,
      }} />
      <div style={{
        position: "absolute",
        width: "68%",
        aspectRatio: "1",
        borderRadius: "50%",
        border: `1px solid rgba(255,255,255,${0.06 + pulse * 0.06})`,
        transform: `scale(${1 + Math.sin(frame / 40 + 1) * 0.04})`,
      }} />

      {/* Icon + text */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        color: "rgba(255,255,255,0.85)", fontFamily: "system-ui", textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          transform: `scale(${1 + pulse * 0.04})`,
        }}>
          🎬
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Demo Preview</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.4, maxWidth: 260 }}>
          Upload a video on the home page{"\n"}to see your footage here
        </div>
      </div>

      <CaptionLayer
        captions={captions}
        segTrimmedStart={0}
        fps={fps}
        preset={preset}
        karaokeMode={karaokeMode}
      />
    </AbsoluteFill>
  );
};

// ─── Multi-clip with TransitionSeries ─────────────────────────────────────────

interface MultiClipProps {
  clips: Clip[];
  fps: number;
  needsBackground: boolean;
  preset: CaptionPreset;
  karaokeMode: boolean;
  effects: VideoEffect;
}

const MultiClipComposition: React.FC<MultiClipProps> = ({
  clips, fps, needsBackground, preset, karaokeMode, effects,
}) => {
  let trimmedTimeOffset = 0;

  return (
    <TransitionSeries>
      {clips.map((clip, clipIndex) => {
        const keptSegments = clip.segments.filter((s) => s.kind === "keep");
        const clipFrames = Math.max(
          1,
          keptSegments.reduce((sum, s) => sum + Math.round((s.endTime - s.startTime) * fps), 0)
        );

        const segTrimmedStart = trimmedTimeOffset;
        trimmedTimeOffset += keptSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

        const transition = clip.transition;
        const transitionEl = clipIndex > 0 ? buildTransition(transition.type) : null;

        return (
          <React.Fragment key={clip.id}>
            {transitionEl && (
              <TransitionSeries.Transition
                timing={transition.type === "flip"
                  ? springTiming({ config: { damping: 200 } })
                  : linearTiming({ durationInFrames: transition.durationFrames })}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                presentation={transitionEl as any}
              />
            )}
            <TransitionSeries.Sequence durationInFrames={clipFrames}>
              <ClipLayer
                clip={clip}
                fps={fps}
                needsBackground={needsBackground}
                preset={preset}
                karaokeMode={karaokeMode}
                effects={effects}
                segTrimmedStart={segTrimmedStart}
              />
            </TransitionSeries.Sequence>
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};

// ─── Single-clip (uploaded video, single file flow) ───────────────────────────

interface SingleClipProps {
  videoSrc: string;
  segments: Segment[];
  captions: Caption[];
  fps: number;
  needsBackground: boolean;
  preset: CaptionPreset;
  karaokeMode: boolean;
  effects: VideoEffect;
}

const SingleClipComposition: React.FC<SingleClipProps> = ({
  videoSrc, segments, captions, fps, needsBackground, preset, karaokeMode, effects,
}) => {
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

  // Fallback: if no segments, show full video
  if (sequenced.length === 0) {
    return (
      <AbsoluteFill>
        <Video src={videoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <CaptionLayer captions={captions} segTrimmedStart={0} fps={fps} preset={preset} karaokeMode={karaokeMode} />
      </AbsoluteFill>
    );
  }

  return (
    <>
      {sequenced.map((s) => {
        const segCaptions = captions.filter(
          (c) => c.startTime >= s.segTrimmedStart &&
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
    </>
  );
};

// ─── Per-clip layer (multi-clip path) ─────────────────────────────────────────

interface ClipLayerProps {
  clip: Clip;
  fps: number;
  needsBackground: boolean;
  preset: CaptionPreset;
  karaokeMode: boolean;
  effects: VideoEffect;
  segTrimmedStart: number;
}

const ClipLayer: React.FC<ClipLayerProps> = ({
  clip, fps, needsBackground, preset, karaokeMode, effects, segTrimmedStart,
}) => {
  const src = clip.videoUrl!;
  let frameOffset = 0;
  let localTrimmed = 0;

  const sequenced = clip.segments
    .filter((s) => s.kind === "keep")
    .map((s) => {
      const startFrom = Math.round(s.startTime * fps);
      const durationInFrames = Math.max(1, Math.round((s.endTime - s.startTime) * fps));
      const offset = frameOffset;
      const segLocal = localTrimmed;
      frameOffset += durationInFrames;
      localTrimmed += s.endTime - s.startTime;
      return { ...s, startFrom, durationInFrames, offset, segLocal };
    });

  return (
    <>
      {sequenced.map((s) => {
        const segCaptions = clip.captions.filter(
          (c) => c.startTime >= s.segLocal &&
                 c.startTime < s.segLocal + (s.endTime - s.startTime)
        );
        return (
          <Sequence key={s.id} from={s.offset} durationInFrames={s.durationInFrames}>
            <SegmentLayer
              src={src}
              startFrom={s.startFrom}
              durationInFrames={s.durationInFrames}
              needsBackground={needsBackground}
              effects={effects}
              captions={segCaptions}
              segTrimmedStart={segTrimmedStart + s.segLocal}
              fps={fps}
              preset={preset}
              karaokeMode={karaokeMode}
            />
          </Sequence>
        );
      })}
    </>
  );
};

// ─── Individual segment layer ─────────────────────────────────────────────────

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
  src, startFrom, durationInFrames, needsBackground,
  effects, captions, segTrimmedStart, fps, preset, karaokeMode,
}) => {
  const frame = useCurrentFrame();
  const { fps: compFps } = useVideoConfig();

  let videoScale = 1;
  let videoTranslateX = 0;
  let videoTranslateY = 0;

  if (effects.kenBurns) {
    videoScale = interpolate(frame, [0, durationInFrames], [1, 1.08]);
    videoTranslateX = interpolate(frame, [0, durationInFrames], [0, -1.5]);
    videoTranslateY = interpolate(frame, [0, durationInFrames], [0, -1]);
  } else if (effects.zoom) {
    const s = spring({ frame, fps: compFps, config: { damping: 100, stiffness: 80 } });
    videoScale = interpolate(s, [0, 1], [1, effects.zoomScale]);
  }

  const segOpacity = interpolate(frame, [0, 4], [0.6, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {needsBackground && <VideoBackground src={src} startFrom={startFrom} />}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {/* Use Video (not OffthreadVideo) — supports blob: URLs from file upload */}
        <Video
          src={src}
          startFrom={startFrom}
          endAt={startFrom + durationInFrames}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${videoScale}) translate(${videoTranslateX}%, ${videoTranslateY}%)`,
            opacity: segOpacity,
            willChange: "transform",
          }}
        />
      </AbsoluteFill>
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

// ─── Build Remotion transition ────────────────────────────────────────────────

function buildTransition(type: string) {
  switch (type) {
    case "fade":        return fade();
    case "slide-left":  return slide({ direction: "from-right" });
    case "slide-right": return slide({ direction: "from-left" });
    case "slide-up":    return slide({ direction: "from-bottom" });
    case "slide-down":  return slide({ direction: "from-top" });
    case "wipe":        return wipe({ direction: "from-left" });
    case "flip":        return flip({ direction: "from-right" });
    case "clock-wipe":  return clockWipe({ width: 1080, height: 1920 });
    default:            return null;
  }
}
