import React from "react";
import { AbsoluteFill, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  src: string;
  startFrom: number;
}

export const VideoBackground: React.FC<Props> = ({ src, startFrom }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

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
        {/* Video supports blob: URLs from file upload; OffthreadVideo does not */}
        <Video
          src={src}
          startFrom={startFrom}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </div>
    </AbsoluteFill>
  );
};
