import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, CaptionPreset } from "@/lib/types";

interface Props {
  captions: Caption[];
  segTrimmedStart: number;
  fps: number;
  preset: CaptionPreset;
  karaokeMode: boolean;
}

export const CaptionLayer: React.FC<Props> = ({
  captions, segTrimmedStart, fps, preset, karaokeMode,
}) => {
  return (
    <>
      {captions.map((caption) => {
        const startFrame = Math.round((caption.startTime - segTrimmedStart) * fps);
        const endFrame = Math.round((caption.endTime - segTrimmedStart) * fps);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={caption.id} from={startFrame} durationInFrames={durationInFrames}>
            {karaokeMode && caption.words?.length ? (
              <KaraokeCaption
                caption={caption}
                segTrimmedStart={segTrimmedStart}
                fps={fps}
                preset={preset}
                durationInFrames={durationInFrames}
              />
            ) : (
              <FullCaption
                text={caption.text}
                preset={preset}
                durationInFrames={durationInFrames}
              />
            )}
          </Sequence>
        );
      })}
    </>
  );
};

// ─── Full caption (no word highlight) ────────────────────────────────────────

interface FullCaptionProps {
  text: string;
  preset: CaptionPreset;
  durationInFrames: number;
}

const FullCaption: React.FC<FullCaptionProps> = ({ text, preset, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const style = useCaptionAnimation(frame, fps, durationInFrames, preset);
  const displayText = preset.uppercase ? text.toUpperCase() : text;

  return (
    <CaptionContainer preset={preset}>
      <CaptionBox preset={preset} style={style}>
        <span style={getTextStyle(preset)}>{displayText}</span>
      </CaptionBox>
    </CaptionContainer>
  );
};

// ─── Karaoke caption (word-by-word highlight) ─────────────────────────────────

interface KaraokeCaptionProps {
  caption: Caption;
  segTrimmedStart: number;
  fps: number;
  preset: CaptionPreset;
  durationInFrames: number;
}

const KaraokeCaption: React.FC<KaraokeCaptionProps> = ({
  caption, segTrimmedStart, fps, preset, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps: compFps } = useVideoConfig();

  const containerStyle = useCaptionAnimation(frame, compFps, durationInFrames, preset);

  // Current time within this caption (in seconds relative to trimmed video)
  const captionTime = segTrimmedStart + frame / fps;

  return (
    <CaptionContainer preset={preset}>
      <CaptionBox preset={preset} style={containerStyle}>
        <span style={{ display: "inline", textAlign: "center" }}>
          {caption.words?.map((word, i) => {
            const isActive = captionTime >= word.startTime && captionTime < word.endTime;
            const isPast = captionTime >= word.endTime;

            // Spring animation when a word becomes active
            const wordFrame = Math.max(0, frame - Math.round((word.startTime - segTrimmedStart) * fps));
            const wordSpring = spring({
              frame: isActive ? Math.min(wordFrame, 6) : 0,
              fps: compFps,
              config: { damping: 60, stiffness: 300, mass: 0.5 },
            });
            const wordScale = isActive ? interpolate(wordSpring, [0, 1], [0.85, 1]) : 1;

            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    ...getTextStyle(preset),
                    color: isActive
                      ? preset.highlightColor
                      : isPast
                      ? `${preset.color}99`
                      : preset.color,
                    transform: `scale(${wordScale})`,
                    display: "inline-block",
                    transition: "color 0.08s ease",
                  }}
                >
                  {preset.uppercase ? word.text.toUpperCase() : word.text}
                </span>
                {i < (caption.words?.length ?? 0) - 1 && (
                  <span style={{ ...getTextStyle(preset), display: "inline" }}>{" "}</span>
                )}
              </React.Fragment>
            );
          })}
        </span>
      </CaptionBox>
    </CaptionContainer>
  );
};

// ─── Shared layout components ─────────────────────────────────────────────────

const CaptionContainer: React.FC<{ preset: CaptionPreset; children: React.ReactNode }> = ({
  preset, children,
}) => {
  const alignMap = { top: "flex-start", center: "center", bottom: "flex-end" };
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: alignMap[preset.position],
        padding: preset.position === "bottom" ? "0 48px 80px" :
                 preset.position === "top"    ? "80px 48px 0" : "0 48px",
        pointerEvents: "none",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const CaptionBox: React.FC<{
  preset: CaptionPreset;
  style: React.CSSProperties;
  children: React.ReactNode;
}> = ({ preset, style, children }) => {
  const bgColor = preset.backgroundColor === "transparent"
    ? "transparent"
    : hexToRgba(preset.backgroundColor, preset.backgroundOpacity);

  // Gradient background for the "gradient" preset
  const background = preset.name === "gradient"
    ? `linear-gradient(135deg, ${hexToRgba(preset.backgroundColor, preset.backgroundOpacity)}, ${hexToRgba("#8B5CF6", preset.backgroundOpacity)})`
    : bgColor;

  return (
    <div
      style={{
        ...style,
        background,
        padding: `${preset.padding}px ${preset.padding * 2}px`,
        borderRadius: preset.borderRadius,
        maxWidth: "88%",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
};

// ─── Animation hook ───────────────────────────────────────────────────────────

function useCaptionAnimation(
  frame: number,
  fps: number,
  durationInFrames: number,
  preset: CaptionPreset
): React.CSSProperties {
  // Guard: proportional fade-in/out so inputRange is always strictly increasing
  const fadeIn = Math.max(1, Math.min(Math.floor(durationInFrames * 0.25), 5));
  const fadeOut = Math.max(fadeIn + 1, durationInFrames - fadeIn);

  switch (preset.animation) {
    case "spring": {
      const s = spring({ frame, fps, config: { damping: 80, stiffness: 200, mass: 0.6 } });
      const scale = interpolate(s, [0, 1], [0.7, 1]);
      const opacity = interpolate(frame, [0, fadeIn, fadeOut, durationInFrames], [0, 1, 1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      return { opacity, transform: `scale(${scale})` };
    }
    case "pop": {
      const s = spring({ frame, fps, config: { damping: 50, stiffness: 400, mass: 0.4 } });
      const scale = interpolate(s, [0, 1], [0.5, 1]);
      const opacity = interpolate(frame, [0, fadeIn, fadeOut, durationInFrames], [0, 1, 1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      return { opacity, transform: `scale(${scale})` };
    }
    case "slide-up": {
      const s = spring({ frame, fps, config: { damping: 100, stiffness: 180 } });
      const y = interpolate(s, [0, 1], [30, 0]);
      const opacity = interpolate(frame, [0, fadeIn, fadeOut, durationInFrames], [0, 1, 1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      return { opacity, transform: `translateY(${y}px)` };
    }
    case "fade": {
      const opacity = interpolate(
        frame,
        [0, fadeIn, fadeOut, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      return { opacity };
    }
    default:
      return {};
  }
}

// ─── Text style from preset ────────────────────────────────────────────────────

function getTextStyle(preset: CaptionPreset): React.CSSProperties {
  return {
    fontFamily: preset.fontFamily,
    fontSize: preset.fontSize,
    fontWeight: preset.fontWeight,
    color: preset.color,
    letterSpacing: `${preset.letterSpacing}em`,
    lineHeight: 1.25,
    WebkitTextStroke: preset.stroke ? `${preset.strokeWidth}px ${preset.strokeColor}` : undefined,
    paintOrder: preset.stroke ? "stroke fill" : undefined,
  } as React.CSSProperties;
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
