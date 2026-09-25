"use client";

import { useState } from "react";

import { monthLabel, movingAverage, niceTicks, shiftMonths, smoothPath, startOfMonth } from "@/components/charts/trendMath";
import { formatShortDate } from "@/lib/format";

export interface BiomechanicsTrendPoint {
  activity_id: string;
  started_at: string;
  distance_km: number;
  activity_type: string | null;
  avg_cadence: number | null;
  avg_stride_length: number | null;
  avg_vertical_oscillation: number | null;
  avg_vertical_ratio: number | null;
  avg_ground_contact_time: number | null;
}

const CHART_HEIGHT = 160;
const TOP = 12;
const BOTTOM = CHART_HEIGHT - 20;
const MOVING_AVERAGE_WINDOW = 5;
const MIN_DOT_PX = 5;
const MAX_DOT_PX = 12;

const TYPE_COLOR: Record<string, string> = {
  running: "var(--color-stat-runs)",
  treadmill_running: "var(--color-stat-time)",
};
const TYPE_LABEL: Record<string, string> = {
  running: "Outdoor",
  treadmill_running: "Treadmill",
};
const DEFAULT_DOT_COLOR = "var(--color-text-muted)";

/** Same dot-scatter + moving-average design as PaceTrendChart, generalized
 * to any single numeric field off BiomechanicsTrendPoint (cadence, stride
 * length, vertical oscillation/ratio, ground contact time) -- one fetch
 * (GET /api/analytics/biomechanics-trend) backs all five dashboard cards,
 * each rendering this component with its own `getValue`/`formatValue`. */
export default function MetricTrendChart({
  data,
  months = 6,
  getValue,
  formatValue,
}: {
  data: BiomechanicsTrendPoint[];
  months?: number;
  getValue: (d: BiomechanicsTrendPoint) => number | null;
  formatValue: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const withValue = data
    .map((d) => ({ d, value: getValue(d) }))
    .filter((p): p is { d: BiomechanicsTrendPoint; value: number } => p.value != null);

  if (withValue.length === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-text-muted">No data yet</p>;
  }

  const values = withValue.map((p) => p.value);
  const yTicks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const domainMin = yTicks[0];
  const domainMax = yTicks[yTicks.length - 1];
  const valSpan = domainMax - domainMin || 1;
  const yForValue = (v: number) => TOP + (1 - (v - domainMin) / valSpan) * (BOTTOM - TOP);

  const distances = withValue.map((p) => p.d.distance_km);
  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);
  const distSpan = maxDist - minDist || 1;

  const domainStart = shiftMonths(startOfMonth(new Date()), -(months - 1)).getTime();
  const domainEnd = Date.now();
  const domainSpan = domainEnd - domainStart || 1;

  const points = withValue.map((p) => {
    const t = new Date(p.d.started_at).getTime();
    const x = Math.min(100, Math.max(0, ((t - domainStart) / domainSpan) * 100));
    const dotPx = MIN_DOT_PX + ((p.d.distance_km - minDist) / distSpan) * (MAX_DOT_PX - MIN_DOT_PX);
    return { x, y: yForValue(p.value), dotPx, value: p.value, d: p.d };
  });

  const maValues = movingAverage(values, MOVING_AVERAGE_WINDOW);
  const maPoints = points.map((p, i) => ({ x: p.x, y: yForValue(maValues[i]) }));
  const trendPath = smoothPath(maPoints);

  const monthTicks = Array.from({ length: months }, (_, i) => {
    const d = shiftMonths(startOfMonth(new Date()), -(months - 1) + i);
    const x = ((d.getTime() - domainStart) / domainSpan) * 100;
    return { x, label: monthLabel(d) };
  });

  return (
    <div>
      <div className="mb-1 text-[10px] text-text-muted">Dot size = distance · Line = {MOVING_AVERAGE_WINDOW}-run average</div>
      <div className="flex gap-2">
        <div className="relative w-9 shrink-0" style={{ height: CHART_HEIGHT }}>
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 truncate text-[10px] text-text-muted"
              style={{ top: `${(yForValue(tick) / CHART_HEIGHT) * 100}%` }}
            >
              {formatValue(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-[160px] w-full">
            <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {yTicks.map((tick) => (
                <line
                  key={tick}
                  x1="0"
                  y1={yForValue(tick)}
                  x2="100"
                  y2={yForValue(tick)}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.4"
                />
              ))}

              {monthTicks.map((t) => (
                <line
                  key={t.label + t.x}
                  x1={t.x}
                  y1={TOP}
                  x2={t.x}
                  y2={BOTTOM}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.4"
                />
              ))}

              <path
                d={trendPath}
                fill="none"
                stroke="var(--color-trend-line)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

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

            {/* Plain HTML dots, not SVG circles -- the chart's non-uniform
                x/y scaling (viewBox stretched to a wide, short box) would
                otherwise distort a <circle> into an ellipse. Fixed-pixel
                hit width (not a % column) since points are time-scaled,
                not evenly spaced. */}
            {points.map((p, i) => {
              const color = p.d.activity_type ? TYPE_COLOR[p.d.activity_type] ?? DEFAULT_DOT_COLOR : DEFAULT_DOT_COLOR;
              return (
                <div
                  key={p.d.activity_id}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                  className="absolute top-0 h-full -translate-x-1/2"
                  style={{ left: `${p.x}%`, width: 14 }}
                >
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      top: `${(p.y / CHART_HEIGHT) * 100}%`,
                      width: hovered === i ? p.dotPx + 3 : p.dotPx,
                      height: hovered === i ? p.dotPx + 3 : p.dotPx,
                      backgroundColor: color,
                      opacity: hovered === i ? 1 : 0.85,
                      boxShadow: "0 0 0 2px var(--color-surface)",
                    }}
                  />
                </div>
              );
            })}

            {hovered != null && (
              <div
                className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs shadow-lg"
                style={{ left: `${points[hovered].x}%` }}
              >
                <div className="font-medium text-text">{formatValue(points[hovered].value)}</div>
                <div className="text-text-muted">
                  {formatShortDate(points[hovered].d.started_at)} · {points[hovered].d.distance_km.toFixed(1)} km
                  {points[hovered].d.activity_type &&
                    ` · ${TYPE_LABEL[points[hovered].d.activity_type!] ?? points[hovered].d.activity_type}`}
                </div>
              </div>
            )}
          </div>

          <div className="relative mt-1 h-3.5 text-[10px] text-text-muted">
            {monthTicks.map((t) => (
              <span key={t.label + t.x} className="absolute -translate-x-1/2" style={{ left: `${t.x}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
