"use client";

import { niceTicks } from "@/components/charts/trendMath";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

const CHART_HEIGHT = 160;
const TOP = 10;
const BOTTOM = CHART_HEIGHT - 10;

/** Per-frame line chart for the video-analysis results: one or more series
 * over frame number, with optional touchdown (red) / midstance (green)
 * dashed markers -- same markers as the notebook's plots. */
export default function FormSeriesChart({
  data,
  series,
  touchdowns = [],
  midstances = [],
  unit = "",
  currentFrame = null,
  onSeek,
}: {
  data: Record<string, number>[];
  series: SeriesDef[];
  touchdowns?: number[];
  midstances?: number[];
  unit?: string;
  /** Video playhead, drawn as a solid line when it falls inside the chart. */
  currentFrame?: number | null;
  /** If given, clicking the plot calls this with the frame under the cursor. */
  onSeek?: (frame: number) => void;
}) {
  if (data.length === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-text-muted">No data</p>;
  }

  const values = data.flatMap((d) => series.map((s) => d[s.key]).filter((v) => Number.isFinite(v)));
  const yTicks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const yMin = yTicks[0];
  const ySpan = yTicks[yTicks.length - 1] - yMin || 1;
  const y = (v: number) => TOP + (1 - (v - yMin) / ySpan) * (BOTTOM - TOP);

  const f0 = data[0].frame;
  const fSpan = data[data.length - 1].frame - f0 || 1;
  const x = (f: number) => ((f - f0) / fSpan) * 100;

  const path = (key: string) =>
    data
      .filter((d) => Number.isFinite(d[key]))
      .map((d, i) => `${i === 0 ? "M" : "L"}${x(d.frame).toFixed(2)},${y(d[key]).toFixed(2)}`)
      .join(" ");

  const xTicks = niceTicks(f0, f0 + fSpan, 5).filter((t) => t >= f0 && t <= f0 + fSpan);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {touchdowns.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 border-l border-dashed" style={{ borderColor: "var(--color-negative)" }} />
            Touchdown
          </span>
        )}
        {midstances.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 border-l border-dashed" style={{ borderColor: "var(--color-positive)" }} />
            Midstance
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative w-10 shrink-0" style={{ height: CHART_HEIGHT }}>
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 text-[10px] text-text-muted"
              style={{ top: `${(y(tick) / CHART_HEIGHT) * 100}%` }}
            >
              {tick}
              {unit}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={"relative h-[160px] w-full" + (onSeek ? " cursor-pointer" : "")}
            onClick={
              onSeek
                ? (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                    onSeek(Math.round(f0 + frac * fSpan));
                  }
                : undefined
            }
          >
            <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {yTicks.map((tick) => (
                <line key={tick} x1={0} x2={100} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {touchdowns.map((f) => (
                <line key={`td${f}`} x1={x(f)} x2={x(f)} y1={TOP} y2={BOTTOM} stroke="var(--color-negative)" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
              ))}
              {midstances.map((f) => (
                <line key={`ms${f}`} x1={x(f)} x2={x(f)} y1={TOP} y2={BOTTOM} stroke="var(--color-positive)" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
              ))}
              {currentFrame != null && currentFrame >= f0 && currentFrame <= f0 + fSpan && (
                <line x1={x(currentFrame)} x2={x(currentFrame)} y1={TOP} y2={BOTTOM} stroke="var(--color-text)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              )}
              {series.map((s) => (
                <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>
          <div className="relative mt-1 h-3 w-full">
            {xTicks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2 text-[10px] text-text-muted" style={{ left: `${x(t)}%` }}>
                {t}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-center text-[10px] text-text-muted">frame</p>
        </div>
      </div>
    </div>
  );
}
