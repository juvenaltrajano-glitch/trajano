import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Blurred video background to fill letterbox areas (used for vertical/square formats)
interface Props {
  src: string;
  startFrom: number;
}

export const VideoBackground: React.FC<Props> = ({ src, startFrom }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle breathing scale to make background feel alive
  const scale = interpolate(frame, [0, durationInFrames], [1.08, 1.15]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: "-10%",
          transform: `scale(${scale})`,
          filter: "blur(24px) brightness(0.45) saturate(1.4)",
          willChange: "transform",
        }}
      >
        <OffthreadVideo
          src={src}
          startFrom={startFrom}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </div>
    </AbsoluteFill>
  );
};
