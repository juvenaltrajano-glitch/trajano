import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Caption, CaptionPreset } from "@/lib/types";

interface Props {
  captions: Caption[];
  segTrimmedStart: number; // seconds: where this segment starts in the trimmed video
  fps: number;
  preset: CaptionPreset;
}

export const CaptionLayer: React.FC<Props> = ({
  captions,
  segTrimmedStart,
  fps,
  preset,
}) => {
  return (
    <>
      {captions.map((caption) => {
        // Convert caption times (trimmed-video seconds) to frames relative to this Sequence
        const startFrame = Math.round((caption.startTime - segTrimmedStart) * fps);
        const endFrame = Math.round((caption.endTime - segTrimmedStart) * fps);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence key={caption.id} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionItem text={caption.text} preset={preset} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </>
  );
};

interface CaptionItemProps {
  text: string;
  preset: CaptionPreset;
  durationInFrames: number;
}

const CaptionItem: React.FC<CaptionItemProps> = ({ text, preset, durationInFrames }) => {
  const frame = useCurrentFrame();

  const opacity =
    preset.animation === "fade"
      ? interpolate(
          frame,
          [0, 4, durationInFrames - 4, durationInFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      : 1;

  const translateY =
    preset.animation === "fade"
      ? interpolate(frame, [0, 8], [10, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const positionStyle: React.CSSProperties =
    preset.position === "bottom"
      ? { bottom: 60, top: "auto" }
      : { top: 60, bottom: "auto" };

  const bgColor =
    preset.backgroundColor === "transparent"
      ? "transparent"
      : hexToRgba(preset.backgroundColor, preset.backgroundOpacity);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: preset.position === "bottom" ? "flex-end" : "flex-start",
        justifyContent: "center",
        padding: "0 48px",
        ...positionStyle,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          fontFamily: preset.fontFamily,
          fontSize: preset.fontSize,
          fontWeight: preset.fontWeight,
          color: preset.color,
          backgroundColor: bgColor,
          padding: `${preset.padding}px ${preset.padding * 2}px`,
          borderRadius: preset.borderRadius,
          textAlign: "center",
          maxWidth: "80%",
          lineHeight: 1.3,
          textShadow:
            preset.backgroundColor === "transparent"
              ? "0 1px 4px rgba(0,0,0,0.8)"
              : "none",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
