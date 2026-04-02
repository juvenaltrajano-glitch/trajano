"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useProjectStore, getSortedClips } from "@/store/useProjectStore";
import { Clip } from "@/lib/types";

// ─── Segment map ──────────────────────────────────────────────────────────────

interface SegRef {
  clipId: string;
  videoUrl: string;
  srcStart: number;  // seconds in source video
  srcEnd: number;
  compStart: number; // seconds in composition
  compEnd: number;
}

function buildSegMap(clips: Clip[]): SegRef[] {
  const out: SegRef[] = [];
  let t = 0;
  for (const clip of clips) {
    if (!clip.videoUrl) continue;
    for (const s of clip.segments) {
      if (s.kind !== "keep") continue;
      const dur = s.endTime - s.startTime;
      out.push({ clipId: clip.id, videoUrl: clip.videoUrl, srcStart: s.startTime, srcEnd: s.endTime, compStart: t, compEnd: t + dur });
      t += dur;
    }
  }
  return out;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NativeVideoPreview() {
  const project = useProjectStore((s) => s.project);
  const clips = getSortedClips(project);

  const realClips = useMemo(
    () => clips.filter((c) => c.videoUrl && (c.videoUrl.startsWith("blob:") || (c.videoUrl.startsWith("/") && c.videoUrl !== "/mock-video.mp4"))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clips.map((c) => c.id).join(",")]
  );

  const segMap = useMemo(() => buildSegMap(realClips), [realClips]);
  const totalDuration = segMap.at(-1)?.compEnd ?? 0;

  const [compTime, setCompTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const compTimeRef = useRef(0);
  compTimeRef.current = compTime;
  const playingRef = useRef(false);
  playingRef.current = playing;

  // ── Get segment at composition time ────────────────────────────────────────
  const getSegAt = useCallback(
    (ct: number) => segMap.find((s) => ct >= s.compStart && ct < s.compEnd) ?? segMap.at(-1) ?? null,
    [segMap]
  );

  // ── Transition to a segment ────────────────────────────────────────────────
  const goToSeg = useCallback(
    (seg: SegRef, shouldPlay: boolean) => {
      // Pause & reset all other videos first
      for (const [id, el] of videoRefs.current) {
        if (id !== seg.clipId) el.pause();
      }
      const el = videoRefs.current.get(seg.clipId);
      if (!el) return;
      el.muted = muted;
      const ct = compTimeRef.current;
      el.currentTime = seg.srcStart + Math.max(0, ct - seg.compStart);
      setActiveClipId(seg.clipId);
      if (shouldPlay) el.play().catch(() => {/* autoplay blocked */});
    },
    [muted]
  );

  // ── Handle timeupdate: advance compTime, detect segment boundary ───────────
  const handleTimeUpdate = useCallback(
    (seg: SegRef, el: HTMLVideoElement) => {
      if (!playingRef.current) return;
      const newComp = seg.compStart + (el.currentTime - seg.srcStart);
      compTimeRef.current = newComp;
      setCompTime(newComp);

      // Past segment end → jump to next
      if (el.currentTime >= seg.srcEnd - 0.08) {
        el.pause();
        const idx = segMap.indexOf(seg);
        const next = segMap[idx + 1];
        if (next) {
          compTimeRef.current = next.compStart;
          setCompTime(next.compStart);
          goToSeg(next, true);
        } else {
          setPlaying(false);
          setCompTime(totalDuration);
        }
      }
    },
    [segMap, totalDuration, goToSeg]
  );

  // ── Attach timeupdate listeners per video ref ─────────────────────────────
  // (Re-runs whenever segMap or handlers change)
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    for (const seg of segMap) {
      const el = videoRefs.current.get(seg.clipId);
      if (!el) continue;
      const fn = () => handleTimeUpdate(seg, el);
      el.addEventListener("timeupdate", fn);
      cleanups.push(() => el.removeEventListener("timeupdate", fn));
    }
    return () => cleanups.forEach((f) => f());
  }, [segMap, handleTimeUpdate]);

  // ── Play / pause ───────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (playing) {
      for (const el of videoRefs.current.values()) el.pause();
      setPlaying(false);
    } else {
      const seg = getSegAt(compTimeRef.current);
      if (!seg) return;
      setPlaying(true);
      goToSeg(seg, true);
    }
  }, [playing, getSegAt, goToSeg]);

  // ── Seek (scrubber) ───────────────────────────────────────────────────────
  const handleSeek = useCallback(
    (newTime: number) => {
      for (const el of videoRefs.current.values()) el.pause();
      setPlaying(false);
      compTimeRef.current = newTime;
      setCompTime(newTime);
      const seg = getSegAt(newTime);
      if (seg) goToSeg(seg, false);
    },
    [getSegAt, goToSeg]
  );

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const handleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    for (const el of videoRefs.current.values()) el.muted = next;
  }, [muted]);

  // ── Reset on clip change ──────────────────────────────────────────────────
  useEffect(() => {
    for (const el of videoRefs.current.values()) el.pause();
    setPlaying(false);
    setCompTime(0);
    setActiveClipId(realClips[0]?.id ?? null);
  }, [realClips.length]);

  // ── Layout ────────────────────────────────────────────────────────────────
  const { format } = project;
  const maxH = 460, maxW = 400;
  const scale = Math.min(maxW / format.width, maxH / format.height);
  const displayW = Math.round(format.width * scale);
  const displayH = Math.round(format.height * scale);
  const progress = totalDuration > 0 ? compTime / totalDuration : 0;

  // Active clip for opacity switching
  const currentActiveId = activeClipId ?? realClips[0]?.id ?? null;

  // ── Placeholder ──────────────────────────────────────────────────────────
  if (realClips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs text-zinc-500">{format.icon} {format.label} · {format.width}×{format.height}</div>
        <div
          className="rounded-2xl ring-1 ring-white/5 shadow-2xl flex items-center justify-center"
          style={{ width: displayW, height: displayH, background: "linear-gradient(135deg,hsl(240,55%,20%),hsl(290,65%,30%))" }}
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

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-zinc-500">{format.icon} {format.label} · {format.width}×{format.height}</div>

      {/* Player */}
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/5 bg-black cursor-pointer"
        style={{ width: displayW, height: displayH }}
        onClick={handlePlayPause}
      >
        {realClips.map((clip) => (
          <video
            key={clip.id}
            ref={(el) => {
              if (el) { videoRefs.current.set(clip.id, el); el.muted = muted; }
              else videoRefs.current.delete(clip.id);
            }}
            src={clip.videoUrl ?? ""}
            playsInline
            preload="auto"
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: currentActiveId === clip.id ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          />
        ))}

        {/* Play overlay when paused */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7L8 5z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 100%)", padding: "24px 10px 8px" }}
        >
          {/* Progress bar */}
          <div
            className="w-full h-1 rounded-full bg-white/25 mb-2 cursor-pointer pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              handleSeek(((e.clientX - r.left) / r.width) * totalDuration);
            }}
          >
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="flex items-center justify-between pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <button onClick={handlePlayPause} className="text-white/90 hover:text-white">
                {playing
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
                }
              </button>
              <span className="text-white/70 text-xs tabular-nums">{fmt(compTime)} / {fmt(totalDuration)}</span>
            </div>
            <button onClick={handleMute} className="text-white/70 hover:text-white text-xs">
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>
      </div>

      {/* Scrubber */}
      <input
        type="range" min={0} max={totalDuration || 1} step={0.033} value={compTime}
        onChange={(e) => handleSeek(Number(e.target.value))}
        className="accent-emerald-500 cursor-pointer"
        style={{ width: displayW }}
      />
    </div>
  );
}
