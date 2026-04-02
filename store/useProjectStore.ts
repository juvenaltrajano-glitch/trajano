import { create } from "zustand";
import {
  AISuggestion, Caption, Clip, FormatId, OverlayConfig, PresetName,
  Segment, SilenceConfig, TransitionType, VideoEffect, VideoProject,
} from "@/lib/types";
import { DEFAULT_EFFECTS, DEFAULT_OVERLAY, DEFAULT_SILENCE_CONFIG, MOCK_PROJECT } from "@/lib/mock";
import { VIDEO_FORMATS } from "@/lib/formats";
import { reorderClips, setClipTransition } from "@/lib/clips";

interface ProjectStore {
  project: VideoProject;
  // AI suggestions state
  suggestions: AISuggestion[];
  suggestionsLoading: boolean;

  // Single-clip actions (upload flow)
  setFile: (file: File, url: string, duration: number, fps: number, w: number, h: number) => void;
  setSegments: (segments: Segment[]) => void;
  toggleSegment: (id: string) => void;
  setCaptions: (captions: Caption[]) => void;

  // Multi-clip actions
  addClip: (clip: Clip) => void;
  removeClip: (clipId: string) => void;
  reorderClip: (clipId: string, toIndex: number) => void;
  setClipTransition: (clipId: string, type: TransitionType, durationFrames?: number) => void;
  setClipSegments: (clipId: string, segments: Segment[]) => void;
  setClipCaptions: (clipId: string, captions: Caption[]) => void;
  toggleClipSegment: (clipId: string, segmentId: string) => void;

  // Global settings
  setPreset: (name: PresetName) => void;
  setKaraokeMode: (enabled: boolean) => void;
  setFormat: (id: FormatId) => void;
  updateSilenceConfig: (config: Partial<SilenceConfig>) => void;
  updateEffects: (effects: Partial<VideoEffect>) => void;
  updateOverlay: (overlay: Partial<OverlayConfig>) => void;

  // AI
  setSuggestions: (suggestions: AISuggestion[]) => void;
  setSuggestionsLoading: (loading: boolean) => void;
  applyReorderSuggestion: (suggestedOrder: string[]) => void;
  applyTransitionSuggestion: (clipId: string, type: TransitionType) => void;

  loadMock: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: MOCK_PROJECT,
  suggestions: [],
  suggestionsLoading: false,

  setFile: (file, url, duration, fps, w, h) =>
    set((state) => ({
      project: {
        ...state.project,
        file, videoUrl: url, duration, fps,
        sourceWidth: w, sourceHeight: h,
        segments: [], captions: [],
        clips: [], // clear mock/old clips so composition uses fresh single-clip path
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

  addClip: (clip) =>
    set((state) => ({
      project: { ...state.project, clips: [...state.project.clips, clip] },
    })),

  removeClip: (clipId) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips
          .filter((c) => c.id !== clipId)
          .map((c, i) => ({ ...c, order: i })),
      },
    })),

  reorderClip: (clipId, toIndex) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: reorderClips(state.project.clips, clipId, toIndex),
      },
    })),

  setClipTransition: (clipId, type, durationFrames) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: setClipTransition(state.project.clips, clipId, type, durationFrames),
      },
    })),

  setClipSegments: (clipId, segments) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, segments } : c
        ),
      },
    })),

  setClipCaptions: (clipId, captions) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, captions } : c
        ),
      },
    })),

  toggleClipSegment: (clipId, segmentId) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                segments: c.segments.map((s) =>
                  s.id === segmentId
                    ? { ...s, kind: s.kind === "keep" ? "removed" : "keep" }
                    : s
                ),
              }
            : c
        ),
      },
    })),

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

  setSuggestions: (suggestions) => set({ suggestions }),
  setSuggestionsLoading: (loading) => set({ suggestionsLoading: loading }),

  applyReorderSuggestion: (suggestedOrder) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: suggestedOrder
          .map((id, i) => {
            const clip = state.project.clips.find((c) => c.id === id);
            return clip ? { ...clip, order: i } : null;
          })
          .filter(Boolean) as Clip[],
      },
    })),

  applyTransitionSuggestion: (clipId, type) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: setClipTransition(state.project.clips, clipId, type),
      },
    })),

  loadMock: () => set({ project: MOCK_PROJECT, suggestions: [] }),
}));

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function getKeptSegments(project: VideoProject): Segment[] {
  return project.segments.filter((s) => s.kind === "keep");
}

export function getKeptDuration(project: VideoProject): number {
  return getKeptSegments(project).reduce(
    (sum, s) => sum + (s.endTime - s.startTime), 0
  );
}

export function getTotalFrames(project: VideoProject): number {
  return Math.max(
    getKeptSegments(project).reduce(
      (sum, s) => sum + Math.round((s.endTime - s.startTime) * project.fps), 0
    ),
    1
  );
}

export function getSortedClips(project: VideoProject): Clip[] {
  return [...project.clips].sort((a, b) => a.order - b.order);
}
