"use client";

import { useState } from "react";

import {
  MIN_BUCKET_RUNS,
  dayMonth,
  hourLabel,
  mmss,
  paceTicks,
  timeBuckets,
  windowLabel,
  type WeatherImpact,
} from "@/lib/weather";

import { LegendDot, LegendLine, Segmented, Unavailable, WxCard } from "./shared";

const W = 1300;
const H = 330;
const L = 80;
const R = 16;
const T = 24;
const Bm = 64;
const H0 = 4;
const H1 = 22;

type Scope = "easy" | "all";
type Metric = "actual" | "same";

/** "Start time vs pace": every outdoor run by the clock, with the average per
 * two-hour window and the number of runs in each window. */
export default function StartTimeCard({ data }: { data: WeatherImpact }) {
  const [scope, setScope] = useState<Scope>("easy");
  const [metric, setMetric] = useState<Metric>("actual");
  const sameEffortOk = data.model != null;
  const m: Metric = sameEffortOk ? metric : "actual";

  const points = data.runs
    .filter((r) => (scope === "easy" ? r.easy : true) && r.hour >= H0 && r.hour < H1)
    .map((r) => ({
      id: r.activity_id,
      t: new Date(r.started_at).getTime(),
      hour: r.hour,
      pace: m === "same" ? r.same_effort_pace_s_per_km : r.pace_s_per_km,
      date: r.started_at,
    }))
    .filter((p): p is typeof p & { pace: number } => p.pace != null);

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Runs shown"
        value={scope}
        onChange={setScope}
        options={[
          { key: "easy", label: "Easy runs" },
          { key: "all", label: "All runs" },
        ]}
      />
      <Segmented
        label="Pace shown"
        value={m}
        onChange={setMetric}
        options={[
          { key: "actual", label: "Actual pace" },
          { key: "same", label: "Same-effort pace", disabled: !sameEffortOk },
        ]}
      />
    </div>
  );

  if (points.length < 2) {
    return (
      <WxCard accent="var(--color-blue)" title="Start time vs pace" right={controls} className="mt-[18px]">
        <Unavailable>not enough outdoor runs with these filters.</Unavailable>
      </WxCard>
    );
  }

  const buckets = timeBuckets(points);
  const solid = buckets.filter((b) => b.n >= MIN_BUCKET_RUNS && b.meanPace != null);
  const fastest = solid.length ? solid.reduce((a, b) => ((b.meanPace as number) < (a.meanPace as number) ? b : a)) : null;
  const usual = buckets.reduce((a, b) => (b.n > a.n ? b : a));
  const diff = fastest && usual.meanPace != null && fastest.meanPace != null ? usual.meanPace - fastest.meanPace : null;

  const paces = points.map((p) => p.pace);
  const ticks = paceTicks(Math.min(...paces) - 4, Math.max(...paces) + 4);
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const X = (h: number) => L + ((h - H0) / (H1 - H0)) * (W - L - R);
  const Y = (v: number) => T + ((v - y0) / (y1 - y0)) * (H - T - Bm);
  const latest = points.reduce((a, b) => (b.t > a.t ? b : a));
  const countY = H - Bm + 44;
  const withMeans = buckets.filter((b) => b.meanPace != null);

  return (
    <WxCard accent="var(--color-blue)" title="Start time vs pace" right={controls} className="mt-[18px]">
      <div className="mb-2.5 grid grid-cols-2 items-center gap-x-8 gap-y-4 lg:grid-cols-[auto_auto_auto_1fr] lg:gap-x-[34px]">
        <Kpi label="Fastest window" color="var(--color-blue)" value={fastest ? windowLabel(fastest.start, fastest.end) : "--"}
          sub={fastest ? `${mmss(fastest.meanPace as number)}/km avg · ${fastest.n} runs` : `needs ${MIN_BUCKET_RUNS}+ runs in a window`} />
        <Kpi label="Your usual time" color="#c9b6ff" value={windowLabel(usual.start, usual.end)}
          sub={`${usual.meanPace != null ? mmss(usual.meanPace) : "--"}/km avg · ${usual.n} runs`} />
        <Kpi label="Difference" value={diff != null ? `${Math.round(Math.abs(diff))} s/km` : "--"}
          sub={diff != null ? `about ${Math.round((Math.abs(diff) * 21.0975) / 60)} min over a half marathon` : "needs a fastest window"} />
        <p className="col-span-2 border-border text-[13px] leading-normal text-text-soft lg:col-span-1 lg:border-l lg:pl-[22px] [&_b]:text-text">
          {fastest && diff != null ? (
            diff > 0 ? (
              <>
                Your pace follows the clock: <b>{windowLabel(fastest.start, fastest.end)}</b> is your fastest window and{" "}
                <b>{windowLabel(usual.start, usual.end)}</b> (your usual) is {Math.round(diff)} s/km slower.
              </>
            ) : (
              <>You&apos;re already running your usual window <b>{windowLabel(usual.start, usual.end)}</b> at your best pace.</>
            )
          ) : (
            <>Most windows have fewer than {MIN_BUCKET_RUNS} runs, so there isn&apos;t enough to say which time of day suits you best yet.</>
          )}
        </p>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pace against start time of day">
        {fastest && (
          <>
            <rect x={X(fastest.start)} y={T} width={X(fastest.end) - X(fastest.start)} height={H - T - Bm} fill="#38d6ff" opacity=".07" />
            <text x={(X(fastest.start) + X(fastest.end)) / 2} y={T + 14} fontSize="11" fill="#38d6ff" fontWeight="600" textAnchor="middle">
              Fastest
            </text>
          </>
        )}
        {usual.n > 0 && (!fastest || usual.start !== fastest.start) && (
          <>
            <rect x={X(usual.start)} y={T} width={X(usual.end) - X(usual.start)} height={H - T - Bm} fill="#a27bff" opacity=".07" />
            <text x={(X(usual.start) + X(usual.end)) / 2} y={T + 14} fontSize="11" fill="#c9b6ff" fontWeight="600" textAnchor="middle">
              Your habit
            </text>
          </>
        )}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#26244a" />
            <text x={L - 10} y={Y(v) + 4} fontSize="11" fill="#9a95c4" textAnchor="end">
              {mmss(v)}
            </text>
          </g>
        ))}
        <text x={L + 4} y={T - 10} fontSize="10.5" fill="#9a95c4">
          faster ↑
        </text>

        {points.map((p) => (
          <circle key={p.id} cx={X(p.hour)} cy={Y(p.pace)} r="4" fill="#8c86c8" opacity=".45">
            <title>{`${new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${mmss(p.pace)}/km`}</title>
          </circle>
        ))}

        {withMeans.slice(0, -1).map((a, i) => {
          const b = withMeans[i + 1];
          const faded = a.n < MIN_BUCKET_RUNS || b.n < MIN_BUCKET_RUNS;
          return (
            <line key={a.start} x1={X(a.center)} y1={Y(a.meanPace as number)} x2={X(b.center)} y2={Y(b.meanPace as number)}
              stroke="#38d6ff" strokeWidth="3" strokeLinecap="round" opacity={faded ? 0.35 : 1} />
          );
        })}
        {withMeans.map((b) => {
          const lo = b.n < MIN_BUCKET_RUNS;
          return (
            <g key={b.start}>
              <circle cx={X(b.center)} cy={Y(b.meanPace as number)} r={lo ? 4 : 5.5} fill={lo ? "#15142a" : "#38d6ff"} stroke="#38d6ff" strokeWidth="2" opacity={lo ? 0.6 : 1} />
              <text x={X(b.center)} y={Y(b.meanPace as number) - 12} fontSize="12" fontWeight="600" textAnchor="middle" fill={lo ? "#9a95c4" : "#fff"}>
                {mmss(b.meanPace as number)}
              </text>
            </g>
          );
        })}

        <circle cx={X(latest.hour)} cy={Y(latest.pace)} r="7" fill="#b6f35a" stroke="#15142a" strokeWidth="2.5" />
        <text x={X(latest.hour)} y={Y(latest.pace) - 14} fontSize="11.5" fill="#b6f35a" fontWeight="600" textAnchor="middle">
          {dayMonth(latest.date)} ·{" "}
          {new Date(latest.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </text>

        {Array.from({ length: (H1 - H0) / 2 + 1 }, (_, i) => H0 + i * 2).map((h) => (
          <text key={h} x={X(h)} y={H - Bm + 18} fontSize="11" fill="#9a95c4" textAnchor="middle">
            {hourLabel(h)}
          </text>
        ))}

        <text x={L - 10} y={countY} fontSize="10.5" fill="#9a95c4" textAnchor="end">Runs</text>
        {buckets.map((b) => {
          const x = X(b.start) + 3;
          const w = X(b.end) - X(b.start) - 6;
          return (
            <g key={b.start}>
              <text x={x + w / 2} y={countY} fontSize="11" fill={b.n === usual.n && b.n > 0 ? "#c9b6ff" : "#9a95c4"} fontWeight={b.n === usual.n && b.n > 0 ? 700 : 400} textAnchor="middle">
                {b.n}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <LegendDot color="#8c86c8">{scope === "easy" ? "One easy outdoor run" : "One outdoor run"}</LegendDot>
          <LegendLine color="var(--color-blue)">Average pace by start time</LegendLine>
          <LegendLine color="var(--color-blue)" faded>Fewer than {MIN_BUCKET_RUNS} runs</LegendLine>
          <LegendDot color="#b6f35a">Latest run</LegendDot>
        </div>
        <span>
          {points.length} outdoor runs · treadmill excluded
          {scope === "all" && m === "same" ? " · same-effort pace extrapolates beyond easy heart rates" : ""}
        </span>
      </div>
    </WxCard>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div>
      <small className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">{label}</small>
      <b className="mb-0.5 mt-1 block text-[26px] font-semibold tracking-[-0.01em]" style={color ? { color } : undefined}>
        {value}
      </b>
      <span className="text-xs text-text-muted">{sub}</span>
    </div>
  );
}
