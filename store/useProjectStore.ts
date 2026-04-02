import { create } from "zustand";
import {
  Caption, FormatId, OverlayConfig, PresetName,
  Segment, SilenceConfig, VideoEffect, VideoFormat, VideoProject,
} from "@/lib/types";
import { DEFAULT_EFFECTS, DEFAULT_OVERLAY, DEFAULT_SILENCE_CONFIG, MOCK_PROJECT } from "@/lib/mock";
import { VIDEO_FORMATS } from "@/lib/formats";

interface ProjectStore {
  project: VideoProject;
  setFile: (file: File, url: string, duration: number, fps: number, w: number, h: number) => void;
  setSegments: (segments: Segment[]) => void;
  toggleSegment: (id: string) => void;
  setCaptions: (captions: Caption[]) => void;
  setPreset: (name: PresetName) => void;
  setKaraokeMode: (enabled: boolean) => void;
  setFormat: (id: FormatId) => void;
  updateSilenceConfig: (config: Partial<SilenceConfig>) => void;
  updateEffects: (effects: Partial<VideoEffect>) => void;
  updateOverlay: (overlay: Partial<OverlayConfig>) => void;
  loadMock: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: MOCK_PROJECT,

  setFile: (file, url, duration, fps, w, h) =>
    set((state) => ({
      project: {
        ...state.project,
        file,
        videoUrl: url,
        duration,
        fps,
        sourceWidth: w,
        sourceHeight: h,
        segments: [],
        captions: [],
      },
    })),

  setSegments: (segments) =>
    set((state) => ({ project: { ...state.project, segments } })),

  toggleSegment: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        segments: state.project.segments.map((s) =>
          s.id === id ? { ...s, kind: s.kind === "keep" ? "removed" : "keep" } : s
        ),
      },
    })),

  setCaptions: (captions) =>
    set((state) => ({ project: { ...state.project, captions } })),

  setPreset: (name) =>
    set((state) => ({ project: { ...state.project, preset: name } })),

  setKaraokeMode: (enabled) =>
    set((state) => ({ project: { ...state.project, karaokeMode: enabled } })),

  setFormat: (id) =>
    set((state) => ({ project: { ...state.project, format: VIDEO_FORMATS[id] } })),

  updateSilenceConfig: (config) =>
    set((state) => ({
      project: { ...state.project, silenceConfig: { ...state.project.silenceConfig, ...config } },
    })),

  updateEffects: (effects) =>
    set((state) => ({
      project: { ...state.project, effects: { ...state.project.effects, ...effects } },
    })),

  updateOverlay: (overlay) =>
    set((state) => ({
      project: { ...state.project, overlay: { ...state.project.overlay, ...overlay } },
    })),

  loadMock: () => set({ project: MOCK_PROJECT }),
}));

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function getKeptSegments(project: VideoProject): Segment[] {
  return project.segments.filter((s) => s.kind === "keep");
}

export function getKeptDuration(project: VideoProject): number {
  return getKeptSegments(project).reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );
}

export function getTotalFrames(project: VideoProject): number {
  return Math.max(
    getKeptSegments(project).reduce(
      (sum, s) => sum + Math.round((s.endTime - s.startTime) * project.fps),
      0
    ),
    1
  );
}
