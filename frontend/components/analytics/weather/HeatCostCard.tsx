import { dayMonth, mmss, paceTicks, signed, type WeatherImpact } from "@/lib/weather";

import { BigStat, ConfidenceNote, LegendDot, LegendLine, Unavailable, WxCard } from "./shared";

const W = 760;
const H = 350;
const L = 50;
const R = 14;
const T = 16;
const B = 34;

const ZONES = [
  { lo: -Infinity, hi: 30, label: "Comfortable", color: "#38d6ff" },
  { lo: 30, hi: 34, label: "Warm", color: "#ffb938" },
  { lo: 34, hi: Infinity, label: "Hot", color: "#ff4d8d" },
];

/** "What heat costs you": easy outdoor runs, pace normalised to the reference heart
 * rate, against feels-like temperature, with the fitted heat trend. */
export default function HeatCostCard({ data }: { data: WeatherImpact }) {
  const { model } = data;
  const right = `${data.easy_runs} easy outdoor runs · last ${data.months} months`;
  const easy = data.runs.filter((r) => r.easy && r.same_effort_pace_s_per_km != null);

  if (!model || easy.length < 2) {
    return (
      <WxCard accent="var(--color-amber)" title="What heat costs you" right={right}>
        <Unavailable>{data.model_unavailable_reason ?? "not enough easy outdoor runs with heart-rate data."}</Unavailable>
      </WxCard>
    );
  }

  const fl = easy.map((r) => r.feels_like_c);
  let x0 = Math.floor(Math.min(...fl)) - 1;
  let x1 = Math.ceil(Math.max(...fl)) + 1;
  if (x1 - x0 < 8) {
    const mid = (x0 + x1) / 2;
    x0 = Math.floor(mid - 4);
    x1 = Math.ceil(mid + 4);
  }
  const paces = easy.map((r) => r.same_effort_pace_s_per_km as number);
  const yTicks = paceTicks(Math.min(...paces) - 4, Math.max(...paces) + 4);
  const y0 = yTicks[0];
  const y1 = yTicks[yTicks.length - 1];
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + ((v - y0) / (y1 - y0)) * (H - T - B);

  const trend = (x: number) => model.mean_same_effort_pace_s_per_km + model.heat_s_per_km_per_c * (x - model.mean_feels_like_c);
  const xa = model.feels_like_min;
  const xb = model.feels_like_max;
  const latest = easy[easy.length - 1];
  const b = model.heat_s_per_km_per_c;
  const xStep = x1 - x0 > 16 ? 4 : 2;

  return (
    <WxCard accent="var(--color-amber)" title="What heat costs you" right={right}>
      <BigStat value={signed(b)} unit="s/km" color={b > 0 ? "var(--color-amber)" : "var(--color-positive)"}>
        per <b>+1°C feels-like</b>, at the same effort. On a 38°C feels-like evening, the same heart rate is{" "}
        <b>
          ~{Math.round(Math.abs(b) * 10)} s/km {b >= 0 ? "slower" : "faster"}
        </b>{" "}
        than on a 28°C morning.
      </BigStat>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pace at 140 bpm against feels-like temperature">
        {ZONES.map((z) => {
          const a = Math.max(x0, z.lo);
          const c = Math.min(x1, z.hi);
          return c > a ? (
            <g key={z.label}>
              <rect x={X(a)} y={T} width={X(c) - X(a)} height={H - T - B} fill={z.color} opacity=".05" />
              <text x={X(a) + 8} y={T + 14} fontSize="11" fill={z.color} opacity=".85" fontWeight="600">
                {z.label}
              </text>
            </g>
          ) : null;
        })}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#26244a" />
            <text x={L - 8} y={Y(v) + 4} fontSize="11" fill="#9a95c4" textAnchor="end">
              {mmss(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor((x1 - x0) / xStep) + 1 }, (_, i) => x0 + i * xStep).map((v) => (
          <text key={v} x={X(v)} y={H - 12} fontSize="11" fill="#9a95c4" textAnchor="middle">
            {v}°
          </text>
        ))}
        <text x={L + 4} y={T - 4} fontSize="10.5" fill="#9a95c4">
          faster ↑
        </text>

        {easy.map((r) => (
          <circle key={r.activity_id} cx={X(r.feels_like_c)} cy={Y(r.same_effort_pace_s_per_km as number)} r="4" fill="#8c86c8" opacity=".5">
            <title>{`${new Date(r.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${mmss(r.same_effort_pace_s_per_km as number)}/km @ ${r.feels_like_c.toFixed(0)}°`}</title>
          </circle>
        ))}

        <line x1={X(xa)} y1={Y(trend(xa))} x2={X(xb)} y2={Y(trend(xb))} stroke="#ffb938" strokeWidth="3" strokeLinecap="round" />
        {[
          { x: xa, anchor: "start" as const },
          { x: xb, anchor: "end" as const },
        ].map(({ x, anchor }) => (
          <g key={x}>
            <circle cx={X(x)} cy={Y(trend(x))} r="5" fill="#ffb938" stroke="#15142a" strokeWidth="2" />
            <text x={X(x)} y={Y(trend(x)) + 22} fontSize="11.5" fill="#fff" fontWeight="600" textAnchor={anchor === "start" ? "start" : "end"}>
              {mmss(trend(x))} @ {Math.round(x)}°
            </text>
          </g>
        ))}

        {latest && (
          <g>
            <line
              x1={X(latest.feels_like_c)}
              x2={X(latest.feels_like_c)}
              y1={Y(latest.same_effort_pace_s_per_km as number)}
              y2={Y(trend(latest.feels_like_c))}
              stroke="#b6f35a"
              strokeDasharray="3 3"
            />
            <circle cx={X(latest.feels_like_c)} cy={Y(latest.same_effort_pace_s_per_km as number)} r="7" fill="#b6f35a" stroke="#15142a" strokeWidth="2.5" />
            <text
              x={X(latest.feels_like_c) - 12}
              y={Y(latest.same_effort_pace_s_per_km as number) + 4}
              fontSize="11.5"
              fill="#b6f35a"
              fontWeight="600"
              textAnchor="end"
            >
              {dayMonth(latest.started_at)} · {mmss(latest.same_effort_pace_s_per_km as number)}
            </text>
          </g>
        )}
      </svg>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <LegendDot color="#8c86c8">Easy run</LegendDot>
          <LegendLine color="var(--color-amber)">Your heat trend</LegendLine>
          <LegendDot color="#b6f35a">Latest run</LegendDot>
        </div>
        <span>
          Pace normalised to {data.reference_hr_bpm} bpm · easy runs = Zone 1–2, 3–15 km
        </span>
      </div>

      <ConfidenceNote level={model.confidence}>
        95% range {signed(model.ci_low)} to {signed(model.ci_high)} s/km per °C
        {model.confidence === "low" && (
          <>
            . Your easy runs span {Math.round(model.feels_like_min)}–{Math.round(model.feels_like_max)}°C feels-like and most sit near{" "}
            {Math.round(model.mean_feels_like_c)}°C, so heat&apos;s effect is hard to separate from other factors. Treat the line as indicative.
          </>
        )}
      </ConfidenceNote>
    </WxCard>
  );
}
