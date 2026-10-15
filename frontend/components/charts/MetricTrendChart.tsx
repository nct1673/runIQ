"use client";

import { useState } from "react";

import { linearRegressionLine, monthLabel, niceTicks, shiftMonths, smoothPath, startOfMonth } from "@/components/charts/trendMath";
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
  avg_hr: number | null;
  avg_power: number | null;
  norm_power: number | null;
  elevation_gain_m: number | null;
  calories: number | null;
  temperature_c: number | null;
  humidity_pct: number | null;
}

const CHART_HEIGHT = 160;
const TOP = 12;
const BOTTOM = CHART_HEIGHT - 20;
const DOT_PX = 8;

const TYPE_COLOR: Record<string, string> = {
  running: "var(--color-stat-runs)",
  treadmill_running: "var(--color-stat-time)",
};
const TYPE_LABEL: Record<string, string> = {
  running: "Outdoor",
  treadmill_running: "Treadmill",
};
const DEFAULT_DOT_COLOR = "var(--color-text-muted)";

/** Same dot-scatter + straight trend-line design as PaceTrendChart, generalized
 * to any single numeric field off BiomechanicsTrendPoint (cadence, stride
 * length, vertical oscillation/ratio, ground contact time) -- one fetch
 * (GET /api/analytics/biomechanics-trend) backs all five dashboard cards,
 * each rendering this component with its own `getValue`/`formatValue`. When
 * `goodDirection` is given, the trend line is colored green/red by whether
 * the metric actually improved first-run to last-run; metrics with no
 * universal "better" direction (e.g. cadence, stride length -- both are
 * target-range, not monotonic) should leave it unset, which renders a
 * neutral line with the delta still shown but unjudged. */
export default function MetricTrendChart({
  data,
  months = 6,
  getValue,
  formatValue,
  getColor,
  goodDirection,
}: {
  data: BiomechanicsTrendPoint[];
  months?: number;
  getValue: (d: BiomechanicsTrendPoint) => number | null;
  formatValue: (v: number) => string;
  /** Overrides the default activity-type dot coloring, e.g. to color by
   * the metric's own value (a zone banding) instead of outdoor/treadmill. */
  getColor?: (d: BiomechanicsTrendPoint) => string;
  /** Which direction counts as "improving" for this metric, if any. */
  goodDirection?: "up" | "down";
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

  const domainStart = shiftMonths(startOfMonth(new Date()), -(months - 1)).getTime();
  const domainEnd = Date.now();
  const domainSpan = domainEnd - domainStart || 1;

  const points = withValue.map((p) => {
    const t = new Date(p.d.started_at).getTime();
    const x = Math.min(100, Math.max(0, ((t - domainStart) / domainSpan) * 100));
    return { x, y: yForValue(p.value), value: p.value, d: p.d };
  });

  const trendPath = smoothPath(linearRegressionLine(points));

  // Separate regression in raw value-space (not pixel-space) just to
  // read off the fitted first-run -> last-run change.
  const trendValueLine = linearRegressionLine(points.map((p) => ({ x: p.x, y: p.value })));
  const delta = trendValueLine[trendValueLine.length - 1].y - trendValueLine[0].y;
  const isImproving = goodDirection != null && (goodDirection === "down" ? delta <= 0 : delta >= 0);
  const trendColor = goodDirection == null ? "var(--color-trend-line)" : isImproving ? "var(--color-positive)" : "var(--color-negative)";
  const deltaSign = delta > 0 ? "+" : delta < 0 ? "-" : "";

  const monthTicks = Array.from({ length: months }, (_, i) => {
    const d = shiftMonths(startOfMonth(new Date()), -(months - 1) + i);
    const x = ((d.getTime() - domainStart) / domainSpan) * 100;
    return { x, label: monthLabel(d) };
  });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-text-muted">
        <span />
        <span
          className={"font-medium " + (goodDirection == null ? "text-text-muted" : isImproving ? "text-positive" : "text-negative")}
          title={`${formatShortDate(points[0].d.started_at)} → ${formatShortDate(points[points.length - 1].d.started_at)}`}
        >
          {deltaSign}
          {formatValue(Math.abs(delta))}
        </span>
      </div>
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
                stroke={trendColor}
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
              const color = getColor
                ? getColor(p.d)
                : p.d.activity_type
                  ? (TYPE_COLOR[p.d.activity_type] ?? DEFAULT_DOT_COLOR)
                  : DEFAULT_DOT_COLOR;
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
                      width: hovered === i ? DOT_PX + 3 : DOT_PX,
                      height: hovered === i ? DOT_PX + 3 : DOT_PX,
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
