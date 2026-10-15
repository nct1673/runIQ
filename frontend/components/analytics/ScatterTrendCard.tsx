import { InfoTip } from "@/components/Card";
import { linearRegressionLine, niceTicks } from "@/components/charts/trendMath";
import { SeriesPoint, SeriesStats } from "@/components/analytics/trendStats";

const W = 440;
const H = 170;
const L = 48;
const R = 10;
const T = 12;
const B = 26;

/** One metric card from the design: headline value + delta chip, then a dot scatter
 * (outdoor = filled, treadmill = ring) with a fitted trend line and optional target band. */
export default function ScatterTrendCard({
  name,
  hint,
  info,
  unit,
  points,
  stats,
  rangeStart,
  rangeEnd,
  invert = false,
  formatTick,
  formatValue,
  formatDelta,
  band,
}: {
  name: string;
  hint: string;
  info: string;
  unit: string;
  points: SeriesPoint[] | null;
  stats: SeriesStats | null;
  rangeStart: number;
  rangeEnd: number;
  invert?: boolean; // true: lower value plots higher (pace)
  formatTick: (v: number) => string;
  formatValue: (v: number) => string;
  formatDelta: (change: number) => string;
  band?: { lo: number; hi: number; label: string }; // use +-Infinity for open ends
}) {
  const ready = points && points.length >= 2;
  const trendColor = stats?.improving === false ? "var(--color-amber)" : "var(--color-positive)";

  let chart: React.ReactNode = (
    <div className="mt-2 flex h-[170px] items-center justify-center text-sm text-text-muted">
      {points ? "Not enough data in this range" : "Loading..."}
    </div>
  );

  if (ready) {
    const values = points.map((p) => p.v);
    const ticks = niceTicks(Math.min(...values), Math.max(...values), 3);
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const y = (v: number) => T + ((invert ? v - lo : hi - v) / (hi - lo || 1)) * (H - T - B);
    const span = rangeEnd - rangeStart || 1;
    const x = (t: number) => L + Math.min(1, Math.max(0, (t - rangeStart) / span)) * (W - L - R);

    const line = linearRegressionLine(points.map((p) => ({ x: p.t, y: p.v })));
    const [a, b] = [line[0], line[line.length - 1]];

    // ~6 evenly spaced month labels
    const months: { t: number; label: string }[] = [];
    const cursor = new Date(rangeStart);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= rangeEnd) {
      if (cursor.getTime() >= rangeStart) months.push({ t: cursor.getTime(), label: cursor.toLocaleDateString(undefined, { month: "short" }) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const step = Math.max(1, Math.ceil(months.length / 6));

    const bandTop = band ? Math.min(y(Math.max(band.lo, lo)), y(Math.min(band.hi, hi))) : 0;
    const bandH = band ? Math.abs(y(Math.max(band.lo, lo)) - y(Math.min(band.hi, hi))) : 0;

    chart = (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-2" role="img" aria-label={`${name} trend`}>
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} stroke="#26244a" />
            <text x={L - 8} y={y(tk) + 3.5} textAnchor="end" fontSize="10" fill="#9a95c4">
              {formatTick(tk)}
            </text>
          </g>
        ))}
        {band && bandH > 0 && (
          <>
            <rect x={L} width={W - L - R} y={bandTop} height={bandH} fill="#b6f35a" opacity=".08" />
            <text x={W - R} y={bandTop + 12} textAnchor="end" fontSize="10" fill="#b6f35a">
              {band.label}
            </text>
          </>
        )}
        {months.map((m, i) =>
          i % step === 0 ? (
            <text key={m.t} x={x(m.t)} y={H - 6} fontSize="10" fill="#9a95c4" textAnchor="middle">
              {m.label}
            </text>
          ) : null,
        )}
        {points.map((p, i) =>
          p.treadmill ? (
            <circle key={i} cx={x(p.t)} cy={y(p.v)} r="3.2" fill="none" stroke="#38d6ff" strokeWidth="1.4" opacity=".8" />
          ) : (
            <circle key={i} cx={x(p.t)} cy={y(p.v)} r="3.3" fill="#8c86c8" opacity=".42" />
          ),
        )}
        <line x1={x(a.x)} y1={y(a.y)} x2={x(b.x)} y2={y(b.y)} stroke={trendColor} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={x(b.x)} cy={y(b.y)} r="5" fill={trendColor} stroke="#15142a" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-5 pb-3.5 pt-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="mt-[3px] text-xs text-text-muted">{hint}</div>
        </div>
        <InfoTip>{info}</InfoTip>
      </div>
      <div className="mb-1 mt-3.5 flex items-baseline gap-2">
        <b className="text-[34px] font-semibold tracking-tight">{stats?.avg30 != null ? formatValue(stats.avg30) : "--"}</b>
        <em className="text-sm not-italic text-text-muted">{unit}</em>
        {stats?.change != null && (
          <span
            className={
              "ml-1 rounded-full px-2 py-[3px] text-[12.5px] font-semibold " +
              (stats.changeGood ? "bg-positive/10 text-positive" : "bg-amber/10 text-amber")
            }
          >
            {formatDelta(stats.change)}
          </span>
        )}
      </div>
      <div className="text-xs text-text-muted">
        30-day avg{stats?.change != null ? ` · vs ${new Date(stats.firstT).toLocaleDateString(undefined, { month: "short" })}` : ""}
      </div>
      {chart}
    </div>
  );
}
