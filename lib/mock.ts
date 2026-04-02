import {
  Caption, CaptionPreset, CaptionWord, Clip, OverlayConfig,
  PresetName, Segment, SilenceConfig, VideoEffect, VideoProject,
} from "./types";
import { DEFAULT_FORMAT } from "./formats";

// ─── Caption Presets ──────────────────────────────────────────────────────────

export const PRESETS: Record<PresetName, CaptionPreset> = {
  minimal: {
    name: "minimal",
    label: "Minimal",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 38,
    fontWeight: 600,
    color: "#FFFFFF",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    highlightColor: "#FACC15",
    position: "bottom",
    animation: "fade",
    padding: 8,
    borderRadius: 0,
    letterSpacing: 0.01,
    uppercase: false,
    stroke: true,
    strokeColor: "#000000",
    strokeWidth: 2,
  },
  bold: {
    name: "bold",
    label: "Bold",
    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
    fontSize: 52,
    fontWeight: 800,
    color: "#FFFF00",
    backgroundColor: "#000000",
    backgroundOpacity: 0.88,
    highlightColor: "#FF4500",
    position: "bottom",
    animation: "pop",
    padding: 18,
    borderRadius: 6,
    letterSpacing: 0.02,
    uppercase: true,
    stroke: false,
    strokeColor: "#000000",
    strokeWidth: 0,
  },
  tiktok: {
    name: "tiktok",
    label: "TikTok",
    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
    fontSize: 56,
    fontWeight: 900,
    color: "#FFFFFF",
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    highlightColor: "#FF2D55", // TikTok pink
    position: "center",
    animation: "spring",
    padding: 10,
    borderRadius: 8,
    letterSpacing: -0.01,
    uppercase: true,
    stroke: true,
    strokeColor: "#000000",
    strokeWidth: 4,
  },
  gradient: {
    name: "gradient",
    label: "Gradient",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 42,
    fontWeight: 700,
    color: "#FFFFFF",
    backgroundColor: "#6366F1", // used as gradient start
    backgroundOpacity: 0.9,
    highlightColor: "#A78BFA",
    position: "bottom",
    animation: "slide-up",
    padding: 16,
    borderRadius: 12,
    letterSpacing: 0,
    uppercase: false,
    stroke: false,
    strokeColor: "#000000",
    strokeWidth: 0,
  },
  cinematic: {
    name: "cinematic",
    label: "Cinematic",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: 40,
    fontWeight: 400,
    color: "#F5F0E8",
    backgroundColor: "#0A0A0A",
    backgroundOpacity: 0.5,
    highlightColor: "#D4AF37",
    position: "bottom",
    animation: "fade",
    padding: 20,
    borderRadius: 2,
    letterSpacing: 0.08,
    uppercase: false,
    stroke: false,
    strokeColor: "#000000",
    strokeWidth: 0,
  },
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SILENCE_CONFIG: SilenceConfig = {
  threshold: -40,
  minDuration: 400,
  padding: 100,
};

export const DEFAULT_EFFECTS: VideoEffect = {
  zoom: false,
  zoomScale: 1.05,
  kenBurns: false,
  blur: false,
};

export const DEFAULT_OVERLAY: OverlayConfig = {
  progressBar: true,
  progressBarColor: "#FF2D55",
  progressBarHeight: 6,
  progressBarPosition: "top",
  showBackground: true,
};

// ─── Mock Segments ────────────────────────────────────────────────────────────

export const MOCK_SEGMENTS: Segment[] = [
  { id: "s1",  startTime: 0,    endTime: 5.2,  kind: "keep" },
  { id: "s2",  startTime: 5.2,  endTime: 7.1,  kind: "removed" },
  { id: "s3",  startTime: 7.1,  endTime: 14.8, kind: "keep" },
  { id: "s4",  startTime: 14.8, endTime: 17.0, kind: "removed" },
  { id: "s5",  startTime: 17.0, endTime: 24.5, kind: "keep" },
  { id: "s6",  startTime: 24.5, endTime: 26.2, kind: "removed" },
  { id: "s7",  startTime: 26.2, endTime: 35.0, kind: "keep" },
  { id: "s8",  startTime: 35.0, endTime: 37.8, kind: "removed" },
  { id: "s9",  startTime: 37.8, endTime: 48.0, kind: "keep" },
  { id: "s10", startTime: 48.0, endTime: 60.0, kind: "keep" },
];

// ─── Caption Generation ───────────────────────────────────────────────────────

const MOCK_PHRASES = [
  "Welcome to this tutorial",
  "Let's start with the basics",
  "Here's what you need to know",
  "This is the key concept",
  "Pay attention to this step",
  "And that's how it works",
  "Let me show you an example",
  "This is really important",
  "Now try it yourself",
  "Thanks for watching",
  "Don't forget to practice",
  "See you next time",
];

// Build word-level timing for karaoke mode
function buildWordTimings(text: string, startTime: number, endTime: number): CaptionWord[] {
  const words = text.split(" ");
  const duration = endTime - startTime;
  const wordDuration = duration / words.length;
  return words.map((word, i) => ({
    text: word,
    startTime: startTime + i * wordDuration,
    endTime: startTime + (i + 1) * wordDuration,
  }));
}

export function generateMockCaptions(segments: Segment[]): Caption[] {
  const captions: Caption[] = [];
  let phraseIndex = 0;
  let trimmedTime = 0;

  segments
    .filter((s) => s.kind === "keep")
    .forEach((seg) => {
      const segDuration = seg.endTime - seg.startTime;
      const count = segDuration > 5 ? 2 : 1;
      const slotDuration = segDuration / count;

      for (let i = 0; i < count; i++) {
        const start = parseFloat((trimmedTime + i * slotDuration + 0.3).toFixed(2));
        const end = parseFloat((start + Math.min(slotDuration - 0.5, 2.8)).toFixed(2));
        const text = MOCK_PHRASES[phraseIndex % MOCK_PHRASES.length];
        captions.push({
          id: `c${captions.length + 1}`,
          text,
          startTime: start,
          endTime: end,
          words: buildWordTimings(text, start, end),
        });
        phraseIndex++;
      }

      trimmedTime += segDuration;
    });

  return captions;
}

export const MOCK_CAPTIONS = generateMockCaptions(MOCK_SEGMENTS);

// ─── Mock Project ─────────────────────────────────────────────────────────────

// ─── Mock Clips (multi-clip demo) ────────────────────────────────────────────

export const MOCK_CLIPS: Clip[] = [
  {
    id: "clip-1",
    file: null,
    videoUrl: "/mock-video.mp4",
    name: "Intro",
    duration: 20,
    fps: 30,
    sourceWidth: 1920,
    sourceHeight: 1080,
    segments: MOCK_SEGMENTS.filter((s) => s.startTime < 20),
    captions: generateMockCaptions(MOCK_SEGMENTS.filter((s) => s.startTime < 20 && s.kind === "keep")),
    transition: { type: "none", durationFrames: 0 },
    order: 0,
  },
  {
    id: "clip-2",
    file: null,
    videoUrl: "/mock-video.mp4",
    name: "Main Content",
    duration: 25,
    fps: 30,
    sourceWidth: 1920,
    sourceHeight: 1080,
    segments: MOCK_SEGMENTS.filter((s) => s.startTime >= 20 && s.startTime < 45).map((s) => ({
      ...s, startTime: s.startTime - 20, endTime: s.endTime - 20,
    })),
    captions: [],
    transition: { type: "fade", durationFrames: 15 },
    order: 1,
  },
  {
    id: "clip-3",
    file: null,
    videoUrl: "/mock-video.mp4",
    name: "Outro",
    duration: 15,
    fps: 30,
    sourceWidth: 1920,
    sourceHeight: 1080,
    segments: MOCK_SEGMENTS.filter((s) => s.startTime >= 45).map((s) => ({
      ...s, startTime: s.startTime - 45, endTime: s.endTime - 45,
    })),
    captions: [],
    transition: { type: "slide-left", durationFrames: 20 },
    order: 2,
  },
];

// ─── Mock Project ─────────────────────────────────────────────────────────────

export const MOCK_PROJECT: VideoProject = {
  file: null,
  videoUrl: "/mock-video.mp4",
  duration: 60,
  fps: 30,
  sourceWidth: 1920,
  sourceHeight: 1080,
  format: DEFAULT_FORMAT,
  segments: MOCK_SEGMENTS,
  captions: MOCK_CAPTIONS,
  clips: MOCK_CLIPS,
  preset: "tiktok",
  karaokeMode: true,
  silenceConfig: DEFAULT_SILENCE_CONFIG,
  effects: DEFAULT_EFFECTS,
  overlay: DEFAULT_OVERLAY,
};
