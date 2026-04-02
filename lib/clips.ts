import { Clip, ClipTransition, Segment, TransitionType } from "./types";
import { generateMockCaptions } from "./mock";

export const DEFAULT_TRANSITION: ClipTransition = {
  type: "fade",
  durationFrames: 15, // 0.5s at 30fps
};

// Build a new Clip from a File + metadata + detected segments
export function createClip(
  file: File,
  videoUrl: string,
  duration: number,
  fps: number,
  sourceWidth: number,
  sourceHeight: number,
  segments: Segment[],
  order: number
): Clip {
  const kept = segments.filter((s) => s.kind === "keep");
  return {
    id: globalThis.crypto.randomUUID(),
    file,
    videoUrl,
    name: file.name.replace(/\.[^/.]+$/, ""), // strip extension
    duration,
    fps,
    sourceWidth,
    sourceHeight,
    segments,
    captions: generateMockCaptions(kept),
    transition: { ...DEFAULT_TRANSITION },
    order,
  };
}

// Move a clip to a new position, re-assign order values
export function reorderClips(clips: Clip[], fromId: string, toIndex: number): Clip[] {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  const fromIndex = sorted.findIndex((c) => c.id === fromId);
  if (fromIndex === -1) return clips;

  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);

  return sorted.map((c, i) => ({ ...c, order: i }));
}

// Update transition for a specific clip
export function setClipTransition(
  clips: Clip[],
  clipId: string,
  type: TransitionType,
  durationFrames?: number
): Clip[] {
  return clips.map((c) =>
    c.id === clipId
      ? { ...c, transition: { type, durationFrames: durationFrames ?? c.transition.durationFrames } }
      : c
  );
}

// Compute the total output duration of all clips (accounting for transition overlaps)
export function getTotalOutputDuration(clips: Clip[]): number {
  const sorted = [...clips].sort((a, b) => a.order - b.order);
  return sorted.reduce((sum, clip, i) => {
    const keptDuration = clip.segments
      .filter((s) => s.kind === "keep")
      .reduce((d, s) => d + (s.endTime - s.startTime), 0);
    // First clip has no transition overlap
    const overlapSeconds =
      i > 0 ? clip.transition.durationFrames / (clip.fps || 30) : 0;
    return sum + keptDuration - overlapSeconds;
  }, 0);
}

// Get captions for a clip offset by its position in the total timeline
export function getClipCaptionsAtOffset(
  clip: Clip,
  timelineOffset: number
): Array<{ text: string; startTime: number; endTime: number }> {
  return clip.captions.map((c) => ({
    text: c.text,
    startTime: c.startTime + timelineOffset,
    endTime: c.endTime + timelineOffset,
  }));
}

// TRANSITION_LABELS for UI display
export const TRANSITION_LABELS: Record<TransitionType, string> = {
  none: "Cut",
  fade: "Fade",
  "slide-left": "Slide Left",
  "slide-right": "Slide Right",
  "slide-up": "Slide Up",
  "slide-down": "Slide Down",
  wipe: "Wipe",
  flip: "Flip",
  "clock-wipe": "Clock Wipe",
};

export const TRANSITION_ICONS: Record<TransitionType, string> = {
  none: "✂️",
  fade: "🌫️",
  "slide-left": "⬅️",
  "slide-right": "➡️",
  "slide-up": "⬆️",
  "slide-down": "⬇️",
  wipe: "🪟",
  flip: "🔄",
  "clock-wipe": "🕐",
};
