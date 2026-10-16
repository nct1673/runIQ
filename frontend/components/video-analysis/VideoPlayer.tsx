"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import { fmtTime, kneeFlexionAt, valueAt } from "@/components/video-analysis/ranges";
import type { AnalysisResult } from "@/components/video-analysis/types";

const SPEEDS = [0.25, 0.5, 1];

function CtrlButton({ children, onClick, label, play }: { children: React.ReactNode; onClick: () => void; label: string; play?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={
        "grid shrink-0 place-items-center " +
        (play
          ? "h-11 w-11 rounded-full bg-white text-[#14102a]"
          : "h-9 w-9 rounded-[10px] border border-border bg-surface-hover text-text-soft hover:text-text")
      }
    >
      {children}
    </button>
  );
}

/** Custom player over the raw <video>: scrubber with touchdown/midstance
 * markers, frame stepping, speed, key-frame jumps and a live metric readout.
 * `videoRef`/`currentFrame`/`seekToFrame` are owned by the workspace so the
 * timeline and check frames can drive the same video. */
export default function VideoPlayer({
  videoId,
  videoRef,
  result,
  currentFrame,
  seekToFrame,
}: {
  videoId: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  result: AnalysisResult | null;
  currentFrame: number | null;
  seekToFrame: (frame: number) => void;
}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showReadout, setShowReadout] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  const fps = result?.fps ?? 0;
  const synced = fps > 0;
  const totalFrames = synced && duration ? Math.round(duration * fps) : 0;

  // Time readout follows the element (also covers fps-less old analyses).
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("seeked", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    onMeta();
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("seeked", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [videoRef, videoId]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, videoRef, videoId]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const seekFraction = (clientX: number, track: HTMLElement) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = track.getBoundingClientRect();
    el.currentTime = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
  };

  const step = (d: number) => {
    const el = videoRef.current;
    if (!el) return;
    if (synced) seekToFrame(Math.max(0, (currentFrame ?? Math.round(el.currentTime * fps)) + d));
    else {
      el.pause();
      el.currentTime = Math.max(0, el.currentTime + d / 30);
    }
  };

  const events = result
    ? [
        ...result.touchdown_frames.map((f) => ({ f, kind: "Touchdown", color: "var(--color-brand)" })),
        ...result.midstance_frames.map((f) => ({ f, kind: "Midstance", color: "var(--color-positive)" })),
      ].sort((a, b) => a.f - b.f)
    : [];

  const progress = duration ? (time / duration) * 100 : 0;
  const nearest =
    synced && currentFrame != null ? events.find((e) => Math.abs(e.f - currentFrame) <= 1) ?? null : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div ref={screenRef} className="relative aspect-video overflow-hidden bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          key={videoId}
          playsInline
          preload="metadata"
          src={`/api/video-analysis/${videoId}/video`}
          onClick={togglePlay}
          className="block h-full w-full cursor-pointer object-contain"
        />
        {result && synced && currentFrame != null && showReadout && (
          <div className="pointer-events-none absolute left-3.5 top-3.5 min-w-[230px] rounded-xl border border-white/10 bg-bg/90 px-3.5 py-3 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              {nearest && (
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase text-white"
                  style={{ background: nearest.kind === "Touchdown" ? "var(--color-brand)" : "#5c8a1f" }}
                >
                  {nearest.kind}
                </span>
              )}
              Frame {currentFrame} · {fmtTime(time)}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-[18px] gap-y-1 text-xs text-text-muted">
              <ReadoutRow label="Knee flexion" v={kneeFlexionAt(result, currentFrame)} />
              <ReadoutRow label="Trunk lean" v={valueAt(result, "trunk_lean", "value", currentFrame)} />
              <ReadoutRow label="Elbow angle" v={valueAt(result, "elbow_angle", "value", currentFrame)} />
              <ReadoutRow label="Arm swing" v={valueAt(result, "arm_swing", "value", currentFrame)} />
            </div>
          </div>
        )}
        {result && synced && (
          <div className="absolute right-3.5 top-3.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowReadout((s) => !s)}
              aria-pressed={showReadout}
              className={
                "rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold " +
                (showReadout ? "border-positive bg-positive text-[#14102a]" : "border-white/15 bg-bg/80 text-text-soft")
              }
            >
              {showReadout ? "✓ " : ""}Angles
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-border px-[18px] pb-4 pt-3.5">
        <div
          className="relative h-[30px] cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setScrubbing(true);
            seekFraction(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => scrubbing && seekFraction(e.clientX, e.currentTarget)}
          onPointerUp={() => setScrubbing(false)}
        >
          <div className="absolute inset-x-0 top-[13px] h-[5px] rounded-full bg-surface-hover" />
          <div
            className="absolute left-0 top-[13px] h-[5px] rounded-full bg-[linear-gradient(90deg,#a27bff,#ff4d8d)]"
            style={{ width: `${progress}%` }}
          />
          {totalFrames > 0 &&
            events.map((e) => (
              <i
                key={`${e.kind}${e.f}`}
                className="absolute top-0 h-[9px] w-[3px] -translate-x-1/2 rounded-sm"
                style={{ left: `${(e.f / totalFrames) * 100}%`, background: e.color }}
              />
            ))}
          <div
            className="absolute top-[7px] h-[17px] w-[17px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,77,141,0.35)]"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <CtrlButton label="Previous frame" onClick={() => step(-1)}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M6 5h2v14H6zM20 5v14l-10-7z" /></svg>
          </CtrlButton>
          <CtrlButton label={playing ? "Pause" : "Play"} onClick={togglePlay} play>
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M7 4l13 8-13 8z" /></svg>
            )}
          </CtrlButton>
          <CtrlButton label="Next frame" onClick={() => step(1)}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M16 5h2v14h-2zM4 5v14l10-7z" /></svg>
          </CtrlButton>
          <span className="ml-1.5 text-[13px] text-text-soft">
            <b className="text-text">{fmtTime(time)}</b> / {fmtTime(duration)}
          </span>
          <span className="flex-1" />
          {totalFrames > 0 && currentFrame != null && (
            <span className="rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-text-muted">
              Frame <b className="text-text">{currentFrame}</b> / {totalFrames}
            </span>
          )}
          <div className="flex rounded-[9px] border border-border bg-surface-hover p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={"rounded-[7px] px-2.5 py-1.5 text-xs " + (s === speed ? "bg-border-strong text-text" : "text-text-muted")}
              >
                {s}×
              </button>
            ))}
          </div>
          <CtrlButton label="Fullscreen" onClick={() => void screenRef.current?.requestFullscreen?.()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </CtrlButton>
        </div>

        {synced && events.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-xs text-text-muted">Key frames</span>
            {events.map((e) => (
              <button
                key={`${e.kind}${e.f}`}
                type="button"
                onClick={() => seekToFrame(e.f)}
                className={
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs " +
                  (currentFrame === e.f
                    ? "border-brand bg-brand/10 text-text"
                    : "border-border bg-surface-hover text-text-soft hover:text-text")
                }
              >
                <i className="h-[7px] w-[7px] rounded-sm" style={{ background: e.color }} />
                {e.kind} · {e.f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReadoutRow({ label, v }: { label: string; v: number | null }) {
  return (
    <>
      <span>{label}</span>
      <b className="text-right font-semibold text-text">{v == null ? "–" : `${v.toFixed(1)}°`}</b>
    </>
  );
}
