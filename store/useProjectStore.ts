import { create } from "zustand";
import { Caption, PresetName, Segment, SilenceConfig, VideoProject } from "@/lib/types";
import { DEFAULT_SILENCE_CONFIG, MOCK_PROJECT } from "@/lib/mock";

interface ProjectStore {
  project: VideoProject;
  setFile: (file: File, url: string, duration: number, fps: number, width: number, height: number) => void;
  setSegments: (segments: Segment[]) => void;
  toggleSegment: (id: string) => void;
  setCaptions: (captions: Caption[]) => void;
  setPreset: (name: PresetName) => void;
  updateSilenceConfig: (config: Partial<SilenceConfig>) => void;
  loadMock: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  // Default to mock project so the editor renders immediately
  project: MOCK_PROJECT,

  setFile: (file, url, duration, fps, width, height) =>
    set((state) => ({
      project: {
        ...state.project,
        file,
        videoUrl: url,
        duration,
        fps,
        width,
        height,
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

  updateSilenceConfig: (config) =>
    set((state) => ({
      project: {
        ...state.project,
        silenceConfig: { ...state.project.silenceConfig, ...config },
      },
    })),

  loadMock: () => set({ project: MOCK_PROJECT }),
}));

// Derived helpers — use these in components instead of duplicating logic
export function getKeptSegments(project: VideoProject): Segment[] {
  return project.segments.filter((s) => s.kind === "keep");
}

export function getKeptDuration(project: VideoProject): number {
  return getKeptSegments(project).reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );
}

export function getDefaultSilenceConfig(): SilenceConfig {
  return DEFAULT_SILENCE_CONFIG;
}
