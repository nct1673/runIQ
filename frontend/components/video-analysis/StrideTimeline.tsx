"use client";

import { useState } from "react";

import { valueAt } from "@/components/video-analysis/ranges";
import type { AnalysisResult } from "@/components/video-analysis/types";

interface Lane {
  name: string;
  hint: string;
  chart: string;
  group: "legs" | "upper";
  series: { key: string; color: string }[];
  value: (r: AnalysisResult, f: number) => string;
  valueHint: string;
}

const fix = (v: number | null, d = 1, unit = "°") => (v == null ? "–" : `${v.toFixed(d)}${unit}`);

const LANES: Lane[] = [
  {
    name: "Ankle vs hip",
    hint: "px · fore/aft",
    chart: "ankle_wave",
    group: "legs",
    series: [
      { key: "right", color: "#ff4d8d" },
      { key: "left", color: "#a27bff" },
    ],
    value: (r, f) => `${fix(valueAt(r, "ankle_wave", "right", f), 0, "")} / ${fix(valueAt(r, "ankle_wave", "left", f), 0, "")}`,
    valueHint: "R / L px",
  },
  {
    name: "Knee angle",
    hint: "180° = straight",
    chart: "knee_angle",
    group: "legs",
    series: [{ key: "value", color: "#b6f35a" }],
    value: (r, f) => fix(valueAt(r, "knee_angle", "value", f), 0),
    valueHint: "knee",
  },
  {
    name: "Trunk lean",
    hint: "+ = forward",
    chart: "trunk_lean",
    group: "upper",
    series: [{ key: "value", color: "#ffb938" }],
    value: (r, f) => fix(valueAt(r, "trunk_lean", "value", f)),
    valueHint: "forward",
  },
  {
    name: "Elbow angle",
    hint: "inner angle",
    chart: "elbow_angle",
    group: "upper",
    series: [{ key: "value", color: "#ff7a45" }],
    value: (r, f) => fix(valueAt(r, "elbow_angle", "value", f), 0),
    valueHint: "elbow",
  },
  {
    name: "Upper-arm swing",
    hint: "0° = vertical",
    chart: "arm_swing",
    group: "upper",
    series: [{ key: "value", color: "#38d6ff" }],
    value: (r, f) => fix(valueAt(r, "arm_swing", "value", f)),
    valueHint: "swing",
  },
];

const W = 1000;
const H = 62;
const TABS = [
  ["all", "All"],
  ["legs", "Legs"],
  ["upper", "Upper body"],
] as const;

export default function StrideTimeline({
  result,
  currentFrame,
  onSeek,
}: {
  result: AnalysisResult;
  currentFrame: number | null;
  onSeek?: (frame: number) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const lanes = LANES.filter((l) => (tab === "all" || l.group === tab) && result.charts[l.chart]?.length);
  const frames = Object.values(result.charts).flatMap((rows) => rows.map((r) => r.frame));
  if (lanes.length === 0 || frames.length === 0) return null;
  const f0 = Math.min(...frames);
  const f1 = Math.max(...frames);
  const sx = (f: number) => ((f - f0) / (f1 - f0 || 1)) * W;
  const axisTicks = Array.from({ length: 6 }, (_, i) => Math.round(f0 + ((f1 - f0) * i) / 5));
  const pairs = result.touchdown_frames.map((td) => ({
    td,
    ms: result.midstance_frames.find((m) => m > td) ?? null,
  }));

  return (
    <section className="rounded-2xl border border-border bg-surface px-5 pb-3 pt-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3.5 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 border-l-2 border-brand bg-brand/20" />Touchdown → midstance</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-0.5 bg-positive" />Midstance</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-0.5 bg-white" />Playhead</span>
        </div>
        <div className="flex gap-1.5">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                "rounded-lg border px-2.5 py-1.5 text-xs " +
                (tab === id ? "border-border-strong bg-surface-hover text-text" : "border-border text-text-muted")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {lanes.map((l) => {
        const rows = result.charts[l.chart];
        const vals = rows.flatMap((r) => l.series.map((s) => r[s.key]).filter(Number.isFinite));
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const sy = (v: number) => 6 + ((hi - v) / (hi - lo || 1)) * (H - 12);
        const frame = currentFrame ?? f0;
        return (
          <div key={l.chart} className="grid grid-cols-[110px_1fr_80px] items-center border-t border-border sm:grid-cols-[150px_1fr_92px]">
            <div className="pr-2.5 text-[13px] font-semibold">
              {l.name}
              <span className="mt-0.5 block text-[11px] font-medium text-text-muted">{l.hint}</span>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              width="100%"
              height={H}
              className={onSeek ? "cursor-pointer" : ""}
              onClick={
                onSeek
                  ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                      onSeek(Math.round(f0 + frac * (f1 - f0)));
                    }
                  : undefined
              }
            >
              {pairs.map(({ td, ms }) => (
                <g key={td}>
                  {ms != null && <rect x={sx(td)} y={0} width={sx(ms) - sx(td)} height={H} fill="#ff4d8d" opacity={0.09} />}
                  <line x1={sx(td)} x2={sx(td)} y1={0} y2={H} stroke="#ff4d8d" strokeWidth={1.5} opacity={0.7} vectorEffect="non-scaling-stroke" />
                  {ms != null && (
                    <line x1={sx(ms)} x2={sx(ms)} y1={0} y2={H} stroke="#b6f35a" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.8} vectorEffect="non-scaling-stroke" />
                  )}
                </g>
              ))}
              {lo < 0 && hi > 0 && (
                <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} stroke="#36335f" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
              )}
              {l.series.map((s) => (
                <path
                  key={s.key}
                  d={rows
                    .filter((r) => Number.isFinite(r[s.key]))
                    .map((r, i) => `${i === 0 ? "M" : "L"}${sx(r.frame).toFixed(1)},${sy(r[s.key]).toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {currentFrame != null && (
                <line x1={sx(frame)} x2={sx(frame)} y1={0} y2={H} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              )}
            </svg>
            <div className="text-right text-[15px] font-semibold">
              {l.value(result, frame)}
              <span className="block text-[10.5px] font-medium text-text-muted">{l.valueHint}</span>
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-[110px_1fr_80px] items-center sm:grid-cols-[150px_1fr_92px]">
        <span />
        <div className="relative h-[26px]">
          {axisTicks.map((t) => (
            <span key={t} className="absolute top-1 -translate-x-1/2 text-[10.5px] text-text-muted" style={{ left: `${(sx(t) / W) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <span className="text-right text-xs text-text-muted">{currentFrame != null ? `value @ F${currentFrame}` : ""}</span>
      </div>
    </section>
  );
}
