"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Card from "@/components/Card";
import FormSeriesChart from "@/components/charts/FormSeriesChart";
import type { AnalysisResult, VideoAnalysis } from "@/components/video-analysis/types";

const deg = (vs: number[]) => (vs.length ? vs.map((v) => `${v.toFixed(1)}°`).join(" / ") : "–");

interface VideoFrameMeta {
  mediaTime: number;
}
interface VideoWithFrameCallback {
  requestVideoFrameCallback?: (cb: (now: number, meta: VideoFrameMeta) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text">{value}</div>
      <div className="mt-0.5 text-[11px] text-text-muted">{hint}</div>
    </div>
  );
}

/**
 * The data side of a video: a pinned player, the metric tiles, the five
 * charts and the annotated check frames. Layout is driven by *container*
 * width (not viewport), so opening the AI Analyse dock next to it just
 * re-flows this area instead of squashing it:
 *   wide  -> player pinned on the left, data scrolling on the right
 *   narrow -> everything stacked
 * The charts draw a playhead that follows the video, and clicking a chart,
 * a check frame or a jump chip seeks the video (needs `fps` in the result).
 */
export default function VideoWorkspace({ video }: { video: VideoAnalysis }) {
  const result = video.result;
  const fps = result?.fps ?? 0;
  const synced = fps > 0;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentFrame, setCurrentFrame] = useState<number | null>(null);

  // Follow the playhead: per presented frame where supported, else timeupdate/seeked.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !synced) return;
    const withCb = el as unknown as VideoWithFrameCallback;
    if (withCb.requestVideoFrameCallback) {
      let handle = 0;
      const loop = (_now: number, meta: VideoFrameMeta) => {
        setCurrentFrame(Math.round(meta.mediaTime * fps));
        handle = withCb.requestVideoFrameCallback!(loop);
      };
      handle = withCb.requestVideoFrameCallback(loop);
      return () => withCb.cancelVideoFrameCallback?.(handle);
    }
    const update = () => setCurrentFrame(Math.round(el.currentTime * fps));
    el.addEventListener("timeupdate", update);
    el.addEventListener("seeked", update);
    return () => {
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("seeked", update);
    };
  }, [fps, synced, video.id]);

  const seekToFrame = useCallback(
    (frame: number) => {
      const el = videoRef.current;
      if (!el || !synced) return;
      el.pause(); // seeking is for inspecting a moment
      el.currentTime = (frame + 0.5) / fps; // land inside the frame, not on its edge
      setCurrentFrame(frame);
    },
    [fps, synced],
  );

  const player = (
    <div className="flex flex-col gap-2">
      <video
        ref={videoRef}
        key={video.id}
        controls
        playsInline
        preload="metadata"
        src={`/api/video-analysis/${video.id}/video`}
        className="w-full rounded-xl border border-border bg-black"
      />
      {result && synced && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-text-muted">Jump to</span>
          {[
            ...result.touchdown_frames.map((f) => ({ f, kind: "Touchdown", color: "var(--color-negative)" })),
            ...result.midstance_frames.map((f) => ({ f, kind: "Midstance", color: "var(--color-positive)" })),
          ]
            .sort((a, b) => a.f - b.f)
            .map(({ f, kind, color }) => (
              <button
                key={`${kind}${f}`}
                type="button"
                onClick={() => seekToFrame(f)}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {kind} {f}
              </button>
            ))}
        </div>
      )}
    </div>
  );

  if (!result) {
    return <div className="max-w-2xl">{player}</div>;
  }

  return (
    <div className="grid gap-4 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="@4xl:sticky @4xl:top-0 @4xl:self-start">{player}</div>
      <ResultsPanel id={video.id} result={result} currentFrame={synced ? currentFrame : null} onSeek={synced ? seekToFrame : undefined} />
    </div>
  );
}

function ResultsPanel({
  id,
  result,
  currentFrame,
  onSeek,
}: {
  id: string;
  result: AnalysisResult;
  currentFrame: number | null;
  onSeek?: (frame: number) => void;
}) {
  const m = result.metrics;
  const shared = {
    touchdowns: result.touchdown_frames,
    midstances: result.midstance_frames,
    currentFrame,
    onSeek,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="text-xs text-text-muted">
        Facing {result.facing}, near side {result.near_side} · {result.strides_analyzed} complete stride
        {result.strides_analyzed === 1 ? "" : "s"} analyzed
      </div>
      {result.warnings.map((w) => (
        <p key={w} className="text-xs text-negative">
          {w}
        </p>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Shank angle at touchdown" value={deg(m.shank_angle_td)} hint="0° = vertical; + = foot lands ahead of knee" />
        <MetricTile
          label="Foot ahead of hip"
          value={m.overstride_calf_td.length ? m.overstride_calf_td.map((v) => v.toFixed(2)).join(" / ") : "–"}
          hint="At touchdown, in calf lengths"
        />
        <MetricTile label="Knee flexion at touchdown" value={deg(m.knee_flexion_td)} hint="0° = straight leg" />
        <MetricTile label="Knee flexion at midstance" value={deg(m.knee_flexion_ms)} hint="Shock absorption" />
        <MetricTile label="Trunk lean" value={m.trunk_lean != null ? `${m.trunk_lean.toFixed(1)}°` : "–"} hint="Stride average; + = forward" />
        <MetricTile label="Elbow angle" value={m.elbow_angle != null ? `${m.elbow_angle.toFixed(0)}°` : "–"} hint="Stride average" />
        <MetricTile
          label="Arm swing range"
          value={m.arm_swing ? `${m.arm_swing.range.toFixed(0)}°` : "–"}
          hint={m.arm_swing ? `${m.arm_swing.min.toFixed(0)}° to ${m.arm_swing.max.toFixed(0)}° from vertical` : ""}
        />
      </div>
      <p className="text-[11px] text-text-muted">
        2D side-view estimates from one video -- best for comparing the same runner over time, not as absolute targets.
        {onSeek && " Click a chart to jump the video to that frame."}
      </p>

      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @4xl:grid-cols-1">
        <Card title="Ankle position relative to hip (px)">
          <FormSeriesChart
            data={result.charts.ankle_wave ?? []}
            series={[
              { key: "right", label: "Right ankle", color: "var(--color-stat-runs)" },
              { key: "left", label: "Left ankle", color: "var(--color-stat-time)" },
            ]}
            {...shared}
          />
        </Card>
        <Card title="Knee angle">
          <FormSeriesChart
            data={result.charts.knee_angle ?? []}
            series={[{ key: "value", label: "Knee angle", color: "var(--color-stat-distance)" }]}
            unit="°"
            {...shared}
          />
        </Card>
        <Card title="Trunk lean">
          <FormSeriesChart
            data={result.charts.trunk_lean ?? []}
            series={[{ key: "value", label: "Trunk lean", color: "var(--color-mileage)" }]}
            unit="°"
            {...shared}
          />
        </Card>
        <Card title="Elbow angle">
          <FormSeriesChart
            data={result.charts.elbow_angle ?? []}
            series={[{ key: "value", label: "Elbow angle", color: "var(--color-stat-energy)" }]}
            unit="°"
            {...shared}
          />
        </Card>
        <Card title="Upper-arm swing">
          <FormSeriesChart
            data={result.charts.arm_swing ?? []}
            series={[{ key: "value", label: "Arm swing", color: "var(--color-stat-time)" }]}
            unit="°"
            {...shared}
          />
        </Card>
      </div>

      {result.check_frames.length > 0 && (
        <Card title="Check frames">
          <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
            {result.check_frames.map((f) => (
              <button
                key={f.file}
                type="button"
                onClick={() => onSeek?.(f.frame)}
                disabled={!onSeek}
                title={onSeek ? "Jump the video to this frame" : undefined}
                className="overflow-hidden rounded-xl border border-border text-left enabled:hover:border-text-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/video-analysis/${id}/frames/${f.file}`} alt={`${f.kind} at frame ${f.frame}`} className="w-full" />
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
