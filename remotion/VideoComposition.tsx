import { AbsoluteFill, Sequence, Video } from "remotion";
import { Caption, CaptionPreset, Segment } from "@/lib/types";
import { CaptionLayer } from "./CaptionLayer";

export interface VideoCompositionProps {
  videoSrc: string;
  segments: Segment[];
  captions: Caption[];
  fps: number;
  preset: CaptionPreset;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  videoSrc,
  segments,
  captions,
  fps,
  preset,
}) => {
  // Build sequenced kept segments with inline frame math — no abstraction layer
  let frameOffset = 0;
  let trimmedTime = 0; // running position in the trimmed (output) video, in seconds

  const sequenced = segments
    .filter((s) => s.kind === "keep")
    .map((s) => {
      const startFrom = Math.round(s.startTime * fps);
      const durationInFrames = Math.max(
        1,
        Math.round((s.endTime - s.startTime) * fps)
      );
      const offset = frameOffset;
      const segTrimmedStart = trimmedTime;

      frameOffset += durationInFrames;
      trimmedTime += s.endTime - s.startTime;

      return { ...s, startFrom, durationInFrames, offset, segTrimmedStart };
    });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sequenced.map((s) => {
        // Captions that fall within this segment's trimmed time window
        const segCaptions = captions.filter(
          (c) =>
            c.startTime >= s.segTrimmedStart &&
            c.startTime < s.segTrimmedStart + (s.endTime - s.startTime)
        );

        return (
          <Sequence key={s.id} from={s.offset} durationInFrames={s.durationInFrames}>
            <AbsoluteFill>
              <Video
                src={videoSrc}
                startFrom={s.startFrom}
                endAt={s.startFrom + s.durationInFrames}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <CaptionLayer
                captions={segCaptions}
                segTrimmedStart={s.segTrimmedStart}
                fps={fps}
                preset={preset}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
