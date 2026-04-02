// All shared types for the AI video editor

export type SegmentKind = "keep" | "removed";

export interface Segment {
  id: string;
  startTime: number; // seconds, relative to original video
  endTime: number;
  kind: SegmentKind;
}

// Word-level caption timing for karaoke-style highlighting
export interface CaptionWord {
  text: string;
  startTime: number; // seconds in trimmed video
  endTime: number;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number; // seconds in trimmed video
  endTime: number;
  words?: CaptionWord[]; // optional word-level timing
}

export type PresetName = "minimal" | "bold" | "tiktok" | "gradient" | "cinematic";

export interface CaptionPreset {
  name: PresetName;
  label: string;
  fontFamily: string;
  fontSize: number;        // px at 1080px height
  fontWeight: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  highlightColor: string;  // word highlight color for karaoke mode
  position: "top" | "center" | "bottom";
  animation: "spring" | "fade" | "slide-up" | "pop" | "none";
  padding: number;
  borderRadius: number;
  letterSpacing: number;
  uppercase: boolean;
  stroke: boolean;         // text stroke/outline
  strokeColor: string;
  strokeWidth: number;
}

// Video output format
export type FormatId = "vertical" | "square" | "landscape" | "portrait";

export interface VideoFormat {
  id: FormatId;
  label: string;
  sublabel: string;
  width: number;
  height: number;
  aspectRatio: string; // CSS string e.g. "9/16"
  icon: string;        // emoji
}

// Effects applied to the video layer
export interface VideoEffect {
  zoom: boolean;
  zoomScale: number;     // 1.0 = no zoom, 1.1 = 10% zoom
  kenBurns: boolean;     // slow pan+zoom
  blur: boolean;         // blur entire video (for background layer)
}

// Optional overlays rendered on top of everything
export interface OverlayConfig {
  progressBar: boolean;
  progressBarColor: string;
  progressBarHeight: number; // px at 1080p
  progressBarPosition: "top" | "bottom";
  showBackground: boolean;   // blurred video background (fills letterbox)
}

export interface SilenceConfig {
  threshold: number;    // dBFS
  minDuration: number;  // ms
  padding: number;      // ms
}

export interface VideoProject {
  file: File | null;
  videoUrl: string | null;
  duration: number;
  fps: number;
  // Original video dimensions (source)
  sourceWidth: number;
  sourceHeight: number;
  // Output format (user-selected)
  format: VideoFormat;
  segments: Segment[];
  captions: Caption[];
  preset: PresetName;
  karaokeMode: boolean;  // word-by-word highlight
  silenceConfig: SilenceConfig;
  effects: VideoEffect;
  overlay: OverlayConfig;
}
