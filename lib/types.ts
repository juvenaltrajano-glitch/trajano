// All shared types for the AI video editor

export type SegmentKind = "keep" | "removed";

export interface Segment {
  id: string;
  startTime: number; // seconds, relative to original video
  endTime: number;
  kind: SegmentKind;
}

export interface CaptionWord {
  text: string;
  startTime: number; // seconds in trimmed video
  endTime: number;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number; // seconds in trimmed (output) video
  endTime: number;
  words?: CaptionWord[];
}

export type PresetName = "minimal" | "bold" | "tiktok" | "gradient" | "cinematic";

export interface CaptionPreset {
  name: PresetName;
  label: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  highlightColor: string;
  position: "top" | "center" | "bottom";
  animation: "spring" | "fade" | "slide-up" | "pop" | "none";
  padding: number;
  borderRadius: number;
  letterSpacing: number;
  uppercase: boolean;
  stroke: boolean;
  strokeColor: string;
  strokeWidth: number;
}

export type FormatId = "vertical" | "square" | "landscape" | "portrait";

export interface VideoFormat {
  id: FormatId;
  label: string;
  sublabel: string;
  width: number;
  height: number;
  aspectRatio: string;
  icon: string;
}

export interface VideoEffect {
  zoom: boolean;
  zoomScale: number;
  kenBurns: boolean;
  blur: boolean;
}

export interface OverlayConfig {
  progressBar: boolean;
  progressBarColor: string;
  progressBarHeight: number;
  progressBarPosition: "top" | "bottom";
  showBackground: boolean;
}

export interface SilenceConfig {
  threshold: number;
  minDuration: number;
  padding: number;
}

// ─── Multi-clip types ─────────────────────────────────────────────────────────

export type TransitionType =
  | "none"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "wipe"
  | "flip"
  | "clock-wipe";

export interface ClipTransition {
  type: TransitionType;
  durationFrames: number; // overlap frames for the transition (e.g. 15 = 0.5s at 30fps)
}

export interface Clip {
  id: string;
  file: File | null;
  videoUrl: string | null;
  name: string;             // display name (filename)
  duration: number;         // seconds
  fps: number;
  sourceWidth: number;
  sourceHeight: number;
  segments: Segment[];
  captions: Caption[];
  transition: ClipTransition; // transition INTO this clip (ignored for first clip)
  order: number;            // position in the sequence (0-indexed)
}

// ─── AI suggestion types ──────────────────────────────────────────────────────

export type SuggestionKind =
  | "reorder"       // suggest a different clip order
  | "transition"    // suggest a transition type for a cut
  | "remove"        // suggest removing a segment
  | "caption"       // suggest caption text improvement
  | "pacing"        // suggest pacing issue
  | "hook";         // suggest a stronger opening hook

export interface AISuggestion {
  id: string;
  kind: SuggestionKind;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  // Optional actionable payload
  clipId?: string;
  segmentId?: string;
  suggestedOrder?: string[];       // clip IDs in suggested order
  suggestedTransition?: TransitionType;
  suggestedCaption?: string;
}

// ─── Project type (updated for multi-clip) ────────────────────────────────────

export interface VideoProject {
  // Legacy single-clip fields (kept for backward compat with upload flow)
  file: File | null;
  videoUrl: string | null;
  duration: number;
  fps: number;
  sourceWidth: number;
  sourceHeight: number;
  segments: Segment[];
  captions: Caption[];

  // Multi-clip
  clips: Clip[];

  // Global settings
  format: VideoFormat;
  preset: PresetName;
  karaokeMode: boolean;
  silenceConfig: SilenceConfig;
  effects: VideoEffect;
  overlay: OverlayConfig;
}
