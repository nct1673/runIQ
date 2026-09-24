"use client";

import { useState } from "react";

import { formatPace, formatShortDate } from "@/lib/format";

export interface PaceTrendPoint {
  activity_id: string;
  started_at: string;
  avg_pace_s_per_km: number;
  distance_km: number;
}

const CHART_HEIGHT = 160;
const TOP = 12;
const BOTTOM = CHART_HEIGHT - 20;

/** Line chart of pace across the most recent runs. Y is deliberately
 * scaled so a *faster* (lower s/km) pace sits higher on the chart --
 * "the line going up" then reads as "getting faster", matching how a
 * runner actually thinks about the trend. Single series: identity comes
 * from the card title, not a legend. */
export default function PaceTrendChart({ data }: { data: PaceTrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-text-muted">No pace data yet</p>;
  }

  const paces = data.map((d) => d.avg_pace_s_per_km);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const span = maxPace - minPace || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
    const y = TOP + ((d.avg_pace_s_per_km - minPace) / span) * (BOTTOM - TOP);
    return { x, y, d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative">
      <div className="mb-1 flex justify-end text-[10px] text-text-muted">faster ↑</div>
      <div className="relative h-[160px] w-full">
        <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <line x1="0" y1={BOTTOM} x2="100" y2={BOTTOM} stroke="var(--color-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

          <path d={linePath} fill="none" stroke="var(--color-brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

          {hovered != null && (
            <line
              x1={points[hovered].x}
              y1={TOP - 6}
              x2={points[hovered].x}
              y2={BOTTOM}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>

        {/* Plain HTML dots, not SVG circles -- the chart's non-uniform x/y
            scaling (viewBox stretched to a wide, short box) would otherwise
            distort a <circle> into an ellipse. */}
        {points.map((p, i) => (
          <div
            key={data[i].activity_id}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            className="absolute top-0 h-full -translate-x-1/2"
            style={{ left: `${p.x}%`, width: `${100 / data.length}%` }}
          >
            <span
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
              style={{
                top: `${(p.y / CHART_HEIGHT) * 100}%`,
                width: hovered === i ? 8 : 6,
                height: hovered === i ? 8 : 6,
                backgroundColor: hovered === i ? "var(--color-brand)" : "var(--color-surface)",
                borderColor: "var(--color-brand)",
              }}
            />
          </div>
        ))}
      </div>

      {hovered != null && (
        <div
          className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${points[hovered].x}%` }}
        >
          <div className="font-medium text-text">{formatPace(data[hovered].avg_pace_s_per_km)}</div>
          <div className="text-text-muted">
            {formatShortDate(data[hovered].started_at)} · {data[hovered].distance_km.toFixed(1)} km
          </div>
        </div>
      )}
    </div>
  );
}
