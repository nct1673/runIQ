"use client";

import { useState } from "react";

import { mmss, monthShort, paceTicks, signedSeconds, type WeatherImpact } from "@/lib/weather";

import { ConfidenceNote, LegendLine, Unavailable, WxCard } from "./shared";

const W = 980;
const H = 220;
const L = 50;
const R = 12;
const T = 12;
const Bm = 28;
const HOT_WINDOW_WEEKS = 4;

/** "Heat-adjusted pace": weekly easy-run pace as run, and as if every run had been
 * at the reference feels-like. The toggle only shows/hides the adjusted line here. */
export default function HeatAdjustedCard({ data }: { data: WeatherImpact }) {
  const [show, setShow] = useState(true);
  const weekly = data.weekly;
  const model = data.model;

  if (!model || weekly.length < 2) {
    return (
      <WxCard accent="var(--color-violet)" title="Heat-adjusted pace" className="mt-[18px]">
        <Unavailable>
          {data.model_unavailable_reason ?? "needs at least two weeks of easy outdoor runs with heart-rate data."}
        </Unavailable>
      </WxCard>
    );
  }

  const t = (w: string) => new Date(w).getTime();
  const tMin = t(weekly[0].week_start);
  const tMax = t(weekly[weekly.length - 1].week_start);
  const span = tMax - tMin || 1;
  const X = (w: string) => L + ((t(w) - tMin) / span) * (W - L - R);

  const values = weekly.flatMap((w) => (show ? [w.actual_pace_s_per_km, w.adjusted_pace_s_per_km] : [w.actual_pace_s_per_km]));
  const ticks = paceTicks(Math.min(...values) - 4, Math.max(...values) + 4);
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const Y = (v: number) => T + ((v - y0) / (y1 - y0)) * (H - T - Bm);
  const path = (get: (w: (typeof weekly)[number]) => number) => weekly.map((w, i) => `${i ? "L" : "M"}${X(w.week_start)},${Y(get(w))}`).join(" ");

  // The stretch with the biggest gap between actual and adjusted pace = the hottest weeks.
  let hot: { a: number; b: number } | null = null;
  if (weekly.length >= HOT_WINDOW_WEEKS + 2) {
    let best = -Infinity;
    for (let i = 0; i + HOT_WINDOW_WEEKS <= weekly.length; i++) {
      const gap = weekly.slice(i, i + HOT_WINDOW_WEEKS).reduce((s, w) => s + (w.actual_pace_s_per_km - w.adjusted_pace_s_per_km), 0);
      if (gap > best) {
        best = gap;
        hot = { a: i, b: i + HOT_WINDOW_WEEKS - 1 };
      }
    }
  }

  const monthTicks: { x: number; label: string }[] = [];
  const cursor = new Date(tMin);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  if (cursor.getTime() < tMin) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() <= tMax) {
    monthTicks.push({ x: L + ((cursor.getTime() - tMin) / span) * (W - L - R), label: cursor.toLocaleDateString(undefined, { month: "short" }) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const labelStep = Math.max(1, Math.ceil(monthTicks.length / 8));
  const s = data.adjusted_summary;
  const last = weekly[weekly.length - 1];

  return (
    <WxCard
      accent="var(--color-violet)"
      title="Heat-adjusted pace"
      className="mt-[18px]"
      right={
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex gap-4">
            <LegendLine color="#6e6a9e">Actual pace</LegendLine>
            <LegendLine color="var(--color-violet)">Adjusted to {data.reference_feels_like_c}°C feels-like</LegendLine>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={show}
            onClick={() => setShow((v) => !v)}
            className="flex h-[30px] items-center gap-2 rounded-[10px] border border-border bg-surface-hover px-2.5 text-xs text-text-soft"
          >
            <span className={"relative h-[16px] w-[28px] rounded-full " + (show ? "bg-positive" : "bg-border-strong")}>
              <span className={"absolute top-0.5 h-3 w-3 rounded-full bg-[#14102a] " + (show ? "right-0.5" : "left-0.5")} />
            </span>
            Show adjusted line
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[230px_1fr]">
        <div className="flex flex-col gap-4">
          {s ? (
            <>
              <Stat label={`Actual, ${monthShort(s.from_month)} → ${monthShort(s.to_month)}`} value={`${mmss(s.actual_from)} → ${mmss(s.actual_to)}`}
                sub={`${signedSeconds(s.actual_to - s.actual_from)}${s.weather_share_s > 5 ? `, but ${monthShort(s.to_month)} was cooler` : s.weather_share_s < -5 ? `, despite hotter ${monthShort(s.to_month)}` : ""}`} />
              {show && (
                <Stat label="Heat-adjusted" color="#c9b6ff" value={`${mmss(s.adjusted_from)} → ${mmss(s.adjusted_to)}`}
                  sub={`${signedSeconds(s.adjusted_to - s.adjusted_from)} ${s.adjusted_to < s.adjusted_from ? "of real fitness gain" : "change after adjusting"}`}
                  subColor={s.adjusted_to < s.adjusted_from ? "var(--color-positive)" : undefined} />
              )}
              {show && (
                <Stat label="Weather's share" value={`~${Math.abs(Math.round(s.weather_share_s))} s`}
                  sub={s.weather_share_s >= 0 ? "of your improvement" : "worked against your improvement"} />
              )}
            </>
          ) : (
            <p className="text-xs text-text-muted">
              Comparing months needs two months with 3+ easy outdoor runs each. The latest week averages {mmss(last.actual_pace_s_per_km)}/km as run.
            </p>
          )}
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Actual and heat-adjusted weekly pace">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#26244a" />
              <text x={L - 8} y={Y(v) + 4} fontSize="11" fill="#9a95c4" textAnchor="end">
                {mmss(v)}
              </text>
            </g>
          ))}
          {monthTicks.map((m, i) =>
            i % labelStep === 0 ? (
              <text key={i} x={m.x} y={H - 6} fontSize="11" fill="#9a95c4" textAnchor="middle">
                {m.label}
              </text>
            ) : null,
          )}
          {hot && show && (
            <>
              <rect x={X(weekly[hot.a].week_start)} y={T} width={Math.max(8, X(weekly[hot.b].week_start) - X(weekly[hot.a].week_start))} height={H - T - Bm} fill="#ff4d8d" opacity=".05" />
              <text x={(X(weekly[hot.a].week_start) + X(weekly[hot.b].week_start)) / 2} y={T + 14} fontSize="10.5" fill="#ff8fb8" textAnchor="middle">
                Hottest weeks: biggest heat penalty
              </text>
            </>
          )}
          <path d={path((w) => w.actual_pace_s_per_km)} fill="none" stroke="#6e6a9e" strokeWidth="2" strokeLinejoin="round" />
          {weekly.map((w) => (
            <circle key={w.week_start} cx={X(w.week_start)} cy={Y(w.actual_pace_s_per_km)} r="2.5" fill="#6e6a9e">
              <title>{`Week of ${new Date(w.week_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${mmss(w.actual_pace_s_per_km)}/km actual, ${mmss(w.adjusted_pace_s_per_km)}/km adjusted (${w.runs} runs)`}</title>
            </circle>
          ))}
          {show && (
            <>
              <path d={path((w) => w.adjusted_pace_s_per_km)} fill="none" stroke="#a27bff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={X(last.week_start)} cy={Y(last.adjusted_pace_s_per_km)} r="5.5" fill="#a27bff" stroke="#15142a" strokeWidth="2" />
            </>
          )}
          <text x={L + 4} y={T - 3} fontSize="10" fill="#9a95c4">
            faster ↑
          </text>
        </svg>
      </div>

      {show && model.confidence !== "high" && (
        <ConfidenceNote level={model.confidence}>
          The adjustment uses the heat cost of {model.heat_s_per_km_per_c >= 0 ? "+" : "−"}
          {Math.abs(model.heat_s_per_km_per_c).toFixed(1)} s/km per °C, which is {model.confidence}-confidence, so treat the adjusted line as indicative.
        </ConfidenceNote>
      )}
    </WxCard>
  );
}

function Stat({ label, value, sub, color, subColor }: { label: string; value: string; sub: string; color?: string; subColor?: string }) {
  return (
    <div>
      <small className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">{label}</small>
      <b className="mb-0.5 mt-1 block text-[22px] font-semibold" style={color ? { color } : undefined}>
        {value}
      </b>
      <span className="text-xs text-text-muted" style={subColor ? { color: subColor } : undefined}>
        {sub}
      </span>
    </div>
  );
}
