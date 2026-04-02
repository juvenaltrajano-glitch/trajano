// All shared types for the AI video editor MVP

export type SegmentKind = "keep" | "removed";

export interface Segment {
  id: string;
  startTime: number; // seconds, relative to original video
  endTime: number;   // seconds
  kind: SegmentKind;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number; // seconds, relative to trimmed (kept) video
  endTime: number;
}

export type PresetName = "minimal" | "bold";

export interface CaptionPreset {
  name: PresetName;
  fontFamily: string;
  fontSize: number;        // px at 1080p
  fontWeight: number;
  color: string;           // hex
  backgroundColor: string; // hex or "transparent"
  backgroundOpacity: number; // 0–1
  position: "top" | "bottom";
  animation: "fade" | "none";
  padding: number;         // px
  borderRadius: number;    // px
}

export interface SilenceConfig {
  threshold: number;    // dBFS, e.g. -40
  minDuration: number;  // ms, ignore silences shorter than this
  padding: number;      // ms, keep this much audio around speech
}

export interface VideoProject {
  file: File | null;
  videoUrl: string | null;
  duration: number;  // seconds
  fps: number;
  width: number;
  height: number;
  segments: Segment[];
  captions: Caption[];
  preset: PresetName;
  silenceConfig: SilenceConfig;
}
