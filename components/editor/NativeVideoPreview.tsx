"use client";

import React, {
  useRef, useState, useEffect, useCallback, useMemo,
} from "react";
import { useProjectStore, getSortedClips } from "@/store/useProjectStore";
import { Clip } from "@/lib/types";

// ─── Segment map ──────────────────────────────────────────────────────────────

interface SegRef {
  clipId: string;
  videoUrl: string;
  srcStart: number;   // seconds in the source video
  srcEnd: number;
  compStart: number;  // seconds in the composition timeline
  compEnd: number;
}

function buildSegMap(clips: Clip[]): SegRef[] {
  const result: SegRef[] = [];
  let compTime = 0;
  for (const clip of clips) {
    if (!clip.videoUrl) continue;
    for (const seg of clip.segments) {
      if (seg.kind !== "keep") continue;
      const dur = seg.endTime - seg.startTime;
      result.push({
        clipId: clip.id,
        videoUrl: clip.videoUrl,
        srcStart: seg.startTime,
        srcEnd: seg.endTime,
        compStart: compTime,
        compEnd: compTime + dur,
      });
      compTime += dur;
    }
  }
  return result;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NativeVideoPreview() {
  const project = useProjectStore((s) => s.project);
  const clips = getSortedClips(project);
  // Only clips with real video sources (blob: from upload, or served paths)
  const realClips = useMemo(
    () => clips.filter((c) => c.videoUrl && (c.videoUrl.startsWith("blob:") || (c.videoUrl.startsWith("/") && c.videoUrl !== "/mock-video.mp4"))),
    [clips]
  );
  const segMap = useMemo(() => buildSegMap(realClips), [realClips]);
  const totalDuration = segMap.at(-1)?.compEnd ?? 0;

  const [compTime, setCompTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const rafRef = useRef<number>(0);
  const prevTsRef = useRef<number>(0);
  const compTimeRef = useRef(0);
  compTimeRef.current = compTime;

  // Identify which segment is active at a given composition time
  const getActiveSeg = useCallback(
    (ct: number) => segMap.find((s) => ct >= s.compStart && ct < s.compEnd) ?? null,
    [segMap]
  );

  // Seek the appropriate video element to match composition time
  const syncVideo = useCallback(
    (ct: number) => {
      const seg = getActiveSeg(ct);
      if (!seg) return;
      const el = videoRefs.current.get(seg.clipId);
      if (!el) return;
      const target = seg.srcStart + (ct - seg.compStart);
      if (Math.abs(el.currentTime - target) > 0.05) {
        el.currentTime = target;
      }
    },
    [getActiveSeg]
  );

  // Playback loop via requestAnimationFrame
  useEffect(() => {
    if (!playing) return;
    const loop = (ts: number) => {
      if (prevTsRef.current === 0) { prevTsRef.current = ts; }
      const delta = Math.min((ts - prevTsRef.current) / 1000, 0.1); // cap at 100ms
      prevTsRef.current = ts;
      const next = compTimeRef.current + delta;
      if (next >= totalDuration) {
        setCompTime(totalDuration);
        setPlaying(false);
        return;
      }
      syncVideo(next);
      setCompTime(next);
      rafRef.current = requestAnimationFrame(loop);
    };
    prevTsRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, syncVideo, totalDuration]);

  // Sync on manual seek / compTime change when paused
  useEffect(() => {
    if (!playing) syncVideo(compTime);
  }, [compTime, playing, syncVideo]);

  // Reset on clip change
  useEffect(() => {
    setPlaying(false);
    setCompTime(0);
  }, [realClips.length]);

  const { format } = project;
  const maxH = 460;
  const maxW = 400;
  const scale = Math.min(maxW / format.width, maxH / format.height);
  const displayW = Math.round(format.width * scale);
  const displayH = Math.round(format.height * scale);

  const activeSeg = getActiveSeg(compTime);
  const progress = totalDuration > 0 ? compTime / totalDuration : 0;

  // ── Placeholder when no real clips uploaded ──────────────────────────────
  if (realClips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs text-zinc-500">
          <span>{format.icon}</span> {format.label} · {format.width}×{format.height}
        </div>
        <div
          className="rounded-2xl ring-1 ring-white/5 shadow-2xl shadow-black/50 flex items-center justify-center"
          style={{
            width: displayW, height: displayH,
            background: "linear-gradient(135deg, hsl(240,55%,20%) 0%, hsl(290,65%,30%) 100%)",
          }}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl">🎬</div>
            <div className="text-white/80 text-sm font-semibold">Demo Preview</div>
            <div className="text-white/40 text-xs">Upload a video to preview</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Real video preview ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-zinc-500">
        <span>{format.icon}</span> {format.label} · {format.width}×{format.height}
      </div>

      {/* Player area */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5 bg-black"
        style={{ width: displayW, height: displayH }}
      >
        {/* One video element per unique clip URL — only the active one is visible */}
        {realClips.map((clip) => (
          <video
            key={clip.id}
            ref={(el) => {
              if (el) videoRefs.current.set(clip.id, el);
              else videoRefs.current.delete(clip.id);
            }}
            src={clip.videoUrl ?? ""}
            muted
            playsInline
            preload="auto"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              // Show only the active clip; instant opacity switch (no transition
              // to keep timing accurate)
              opacity: activeSeg?.clipId === clip.id ? 1 : 0,
            }}
          />
        ))}

        {/* Controls overlay */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
            padding: "8px 12px 10px",
          }}
        >
          {/* Progress bar */}
          <div
            className="w-full h-1 rounded-full bg-white/20 mb-2 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const t = ((e.clientX - rect.left) / rect.width) * totalDuration;
              setCompTime(Math.max(0, Math.min(totalDuration, t)));
              setPlaying(false);
            }}
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Time + play/pause */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="text-white/90 hover:text-white transition-colors"
            >
              {playing ? (
                // Pause icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                // Play icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z"/>
                </svg>
              )}
            </button>
            <span className="text-white/70 text-xs tabular-nums">
              {fmtTime(compTime)} / {fmtTime(totalDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Scrub bar below player */}
      <input
        type="range"
        min={0}
        max={totalDuration}
        step={0.033}
        value={compTime}
        onChange={(e) => {
          setCompTime(Number(e.target.value));
          setPlaying(false);
        }}
        className="w-full accent-emerald-500 cursor-pointer"
        style={{ maxWidth: displayW }}
      />
    </div>
  );
}
