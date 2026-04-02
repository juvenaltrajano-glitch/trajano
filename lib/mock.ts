import { Caption, CaptionPreset, PresetName, Segment, SilenceConfig, VideoProject } from "./types";

// Caption style presets
export const PRESETS: Record<PresetName, CaptionPreset> = {
  minimal: {
    name: "minimal",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 32,
    fontWeight: 400,
    color: "#FFFFFF",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    position: "bottom",
    animation: "fade",
    padding: 8,
    borderRadius: 0,
  },
  bold: {
    name: "bold",
    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
    fontSize: 48,
    fontWeight: 800,
    color: "#FFFF00",
    backgroundColor: "#000000",
    backgroundOpacity: 0.85,
    position: "bottom",
    animation: "none",
    padding: 16,
    borderRadius: 4,
  },
};

export const DEFAULT_SILENCE_CONFIG: SilenceConfig = {
  threshold: -40,
  minDuration: 400,
  padding: 100,
};

// Mock segments representing a 60s video with pauses removed
export const MOCK_SEGMENTS: Segment[] = [
  { id: "s1", startTime: 0,    endTime: 5.2,  kind: "keep" },
  { id: "s2", startTime: 5.2,  endTime: 7.1,  kind: "removed" },
  { id: "s3", startTime: 7.1,  endTime: 14.8, kind: "keep" },
  { id: "s4", startTime: 14.8, endTime: 17.0, kind: "removed" },
  { id: "s5", startTime: 17.0, endTime: 24.5, kind: "keep" },
  { id: "s6", startTime: 24.5, endTime: 26.2, kind: "removed" },
  { id: "s7", startTime: 26.2, endTime: 35.0, kind: "keep" },
  { id: "s8", startTime: 35.0, endTime: 37.8, kind: "removed" },
  { id: "s9", startTime: 37.8, endTime: 48.0, kind: "keep" },
  { id: "s10", startTime: 48.0, endTime: 60.0, kind: "keep" },
];

// Generate mock captions from kept segments (1-2 captions per segment)
export function generateMockCaptions(segments: Segment[]): Caption[] {
  const phrases = [
    "Welcome to this video tutorial.",
    "Let's start with the basics.",
    "Here's what you need to know.",
    "This is the key concept to understand.",
    "Pay attention to this step.",
    "And that's how it works.",
    "Let me show you another example.",
    "This is really important.",
    "Now you can try it yourself.",
    "Thanks for watching!",
    "Don't forget to practice.",
    "See you in the next video.",
  ];

  const captions: Caption[] = [];
  let phraseIndex = 0;
  let trimmedTime = 0;

  segments
    .filter((s) => s.kind === "keep")
    .forEach((seg) => {
      const segDuration = seg.endTime - seg.startTime;
      // Place 1 or 2 captions depending on segment length
      const count = segDuration > 5 ? 2 : 1;
      const slotDuration = segDuration / count;

      for (let i = 0; i < count; i++) {
        const start = trimmedTime + i * slotDuration + 0.3;
        const end = start + Math.min(slotDuration - 0.6, 3);
        captions.push({
          id: `c${captions.length + 1}`,
          text: phrases[phraseIndex % phrases.length],
          startTime: parseFloat(start.toFixed(2)),
          endTime: parseFloat(end.toFixed(2)),
        });
        phraseIndex++;
      }

      trimmedTime += segDuration;
    });

  return captions;
}

export const MOCK_CAPTIONS: Caption[] = generateMockCaptions(MOCK_SEGMENTS);

export const MOCK_PROJECT: VideoProject = {
  file: null,
  videoUrl: "/mock-video.mp4",
  duration: 60,
  fps: 30,
  width: 1920,
  height: 1080,
  segments: MOCK_SEGMENTS,
  captions: MOCK_CAPTIONS,
  preset: "minimal",
  silenceConfig: DEFAULT_SILENCE_CONFIG,
};
