"use client";

import { useState } from "react";

import { linearRegressionLine, monthLabel, niceTicks, shiftMonths, smoothPath, startOfMonth } from "@/components/charts/trendMath";
import { formatPace, formatShortDate } from "@/lib/format";

export interface PaceTrendPoint {
  activity_id: string;
  started_at: string;
  avg_pace_s_per_km: number;
  distance_km: number;
  activity_type: string | null;
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

/** "-0:18/km" / "+0:05/km" -- signed pace delta, same m:ss shape as
 * formatPace but handling the sign itself (formatPace assumes a
 * positive absolute pace). */
function formatPaceDelta(deltaSPerKm: number): string {
  const sign = deltaSPerKm > 0 ? "+" : deltaSPerKm < 0 ? "-" : "";
  const abs = Math.abs(deltaSPerKm);
  const minutes = Math.floor(abs / 60);
  const seconds = Math.round(abs % 60)
    .toString()
    .padStart(2, "0");
  return `${sign}${minutes}:${seconds}/km`;
}

/** Scatter of individual runs (fixed dot size, color = outdoor vs
 * treadmill) plus a straight least-squares trend line, x-axis a real
 * calendar timeline over the last `months` months -- matches how far
 * back GET /api/analytics/pace-trend?months= actually queries
 * (AEROBIC_BASE runs only, see analytics_service.get_pace_trend). Y is
 * deliberately scaled so a *faster* (lower s/km) pace sits higher on
 * the chart -- "the line going up" then reads as "getting faster". The
 * trend line itself is colored by whether pace improved (green) or
 * worsened (red) first-run to last-run, with the raw delta as a label. */
export default function PaceTrendChart({ data, months = 6 }: { data: PaceTrendPoint[]; months?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-text-muted">No pace data yet</p>;
  }

  const paces = data.map((d) => d.avg_pace_s_per_km);
  const yTicks = niceTicks(Math.min(...paces), Math.max(...paces), 4);
  const domainMin = yTicks[0];
  const domainMax = yTicks[yTicks.length - 1];
  const paceSpan = domainMax - domainMin || 1;
  // Low pace (fast) -> small y (top); "faster ↑" reads correctly.
  const yForValue = (v: number) => TOP + ((v - domainMin) / paceSpan) * (BOTTOM - TOP);

  const domainStart = shiftMonths(startOfMonth(new Date()), -(months - 1)).getTime();
  const domainEnd = Date.now();
  const domainSpan = domainEnd - domainStart || 1;

  const points = data.map((d) => {
    const t = new Date(d.started_at).getTime();
    const x = Math.min(100, Math.max(0, ((t - domainStart) / domainSpan) * 100));
    return { x, y: yForValue(d.avg_pace_s_per_km), d };
  });

  const trendPath = smoothPath(linearRegressionLine(points));

  // Separate regression in raw value-space (not pixel-space) just to
  // read off the fitted first-run -> last-run change.
  const trendValueLine = linearRegressionLine(points.map((p) => ({ x: p.x, y: p.d.avg_pace_s_per_km })));
  const paceDelta = trendValueLine[trendValueLine.length - 1].y - trendValueLine[0].y;
  const isImproving = paceDelta <= 0; // lower pace = faster = better
  const trendColor = isImproving ? "var(--color-positive)" : "var(--color-negative)";

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
          className={"font-medium " + (isImproving ? "text-positive" : "text-negative")}
          title={`${formatShortDate(data[0].started_at)} → ${formatShortDate(data[data.length - 1].started_at)}`}
        >
          {formatPaceDelta(paceDelta)}
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative w-11 shrink-0" style={{ height: CHART_HEIGHT }}>
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 truncate text-[10px] text-text-muted"
              style={{ top: `${(yForValue(tick) / CHART_HEIGHT) * 100}%` }}
            >
              {formatPace(tick)}
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
              const color = p.d.activity_type ? TYPE_COLOR[p.d.activity_type] ?? DEFAULT_DOT_COLOR : DEFAULT_DOT_COLOR;
              return (
                <div
                  key={data[i].activity_id}
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
                <div className="font-medium text-text">{formatPace(data[hovered].avg_pace_s_per_km)}</div>
                <div className="text-text-muted">
                  {formatShortDate(data[hovered].started_at)} · {data[hovered].distance_km.toFixed(1)} km
                  {data[hovered].activity_type && ` · ${TYPE_LABEL[data[hovered].activity_type!] ?? data[hovered].activity_type}`}
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
