import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { OverlayConfig } from "@/lib/types";

interface Props {
  overlay: OverlayConfig;
}

export const ProgressBar: React.FC<Props> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = frame / durationInFrames;
  const widthPct = interpolate(progress, [0, 1], [0, 100]);

  const posStyle: React.CSSProperties =
    overlay.progressBarPosition === "top"
      ? { top: 0, bottom: "auto" }
      : { bottom: 0, top: "auto" };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: overlay.progressBarHeight,
          backgroundColor: "rgba(255,255,255,0.15)",
          ...posStyle,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${widthPct}%`,
            backgroundColor: overlay.progressBarColor,
            borderRadius: "0 2px 2px 0",
            boxShadow: `0 0 8px ${overlay.progressBarColor}88`,
            transition: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
