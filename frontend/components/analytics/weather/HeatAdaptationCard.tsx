import { monthShort, signed, slopeTicks, type WeatherImpact } from "@/lib/weather";

import { BigStat, ConfidenceNote, Unavailable, WxCard } from "./shared";

const W = 420;
const H = 330;
const L = 34;
const T = 22;
const Bm = 28;

/** "Heat adaptation": the heat cost (s/km per °C) fitted separately inside each month.
 * Only months with enough runs *and* temperature variation get a bar. */
export default function HeatAdaptationCard({ data }: { data: WeatherImpact }) {
  const reliable = data.monthly.filter((m) => m.reliable);
  const change = data.heat_cost_change;
  const bySlope = (m: string) => data.monthly.find((x) => x.month === m);
  const right = "Heat cost per month";

  if (data.monthly.length === 0) {
    return (
      <WxCard accent="var(--color-positive)" title="Heat adaptation" right={right}>
        <Unavailable>no easy outdoor runs with weather in this range.</Unavailable>
      </WxCard>
    );
  }

  const lows = reliable.map((m) => (m.slope_s_per_km_per_c as number) - (m.se ?? 0));
  const highs = reliable.map((m) => (m.slope_s_per_km_per_c as number) + (m.se ?? 0));
  const ticks = slopeTicks(Math.min(0, ...lows), Math.max(1, ...highs));
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const Y = (v: number) => T + ((y1 - v) / (y1 - y0 || 1)) * (H - T - Bm);
  const slot = (W - L - 8) / Math.max(data.monthly.length, 1);
  const bw = Math.min(44, slot * 0.7);
  const lastReliable = reliable[reliable.length - 1]?.month;

  return (
    <WxCard accent="var(--color-positive)" title="Heat adaptation" right={right}>
      {change ? (
        <>
          <BigStat
            value={`${change.pct_change <= 0 ? "−" : "+"}${Math.abs(Math.round(change.pct_change))}%`}
            color={change.pct_change <= 0 ? "var(--color-positive)" : "var(--color-amber)"}
          >
            since {monthShort(change.from_month)}.{" "}
            {change.pct_change <= 0 ? "Heat is slowing you down less" : "Heat is slowing you down more"}:{" "}
            <b>
              {change.from_value.toFixed(1)} → {change.to_value.toFixed(1)} s/km per °C
            </b>
            .
          </BigStat>
          {change.confidence === "low" && (
            <ConfidenceNote level="low">
              Each month&apos;s estimate is noisy (±{(bySlope(change.from_month)?.se ?? 0).toFixed(1)} and ±
              {(bySlope(change.to_month)?.se ?? 0).toFixed(1)} s/km per °C), so this change is not statistically solid.
            </ConfidenceNote>
          )}
        </>
      ) : (
        <BigStat value="--" color="var(--color-text-muted)">
          Not enough reliable months yet. A month needs <b>5+ easy outdoor runs</b> and <b>3°C+ of feels-like variation</b>.
        </BigStat>
      )}

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-1" role="img" aria-label="Heat cost per month">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? "#36335f" : "#26244a"} />
            <text x={L - 8} y={Y(v) + 4} fontSize="11" fill="#9a95c4" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <text x={0} y={10} fontSize="10" fill="#9a95c4">
          s/km per °C
        </text>
        {data.monthly.map((m, i) => {
          const x = L + 8 + i * slot + (slot - bw) / 2;
          const cx = x + bw / 2;
          const last = m.month === lastReliable;
          return (
            <g key={m.month}>
              {m.reliable && m.slope_s_per_km_per_c != null ? (
                <>
                  <rect
                    x={x}
                    y={Math.min(Y(m.slope_s_per_km_per_c), Y(0))}
                    width={bw}
                    height={Math.max(1.5, Math.abs(Y(0) - Y(m.slope_s_per_km_per_c)))}
                    rx="6"
                    fill={last ? "#b6f35a" : "#3f3a72"}
                  >
                    <title>{`${monthShort(m.month)}: ${signed(m.slope_s_per_km_per_c)} s/km per °C (±${(m.se ?? 0).toFixed(1)}, ${m.runs} runs)`}</title>
                  </rect>
                  {m.se != null && (
                    <g stroke={last ? "#b6f35a" : "#cfccf0"} strokeWidth="1.4" opacity=".75">
                      <line x1={cx} x2={cx} y1={Y(m.slope_s_per_km_per_c - m.se)} y2={Y(m.slope_s_per_km_per_c + m.se)} />
                      <line x1={cx - 4} x2={cx + 4} y1={Y(m.slope_s_per_km_per_c + m.se)} y2={Y(m.slope_s_per_km_per_c + m.se)} />
                      <line x1={cx - 4} x2={cx + 4} y1={Y(m.slope_s_per_km_per_c - m.se)} y2={Y(m.slope_s_per_km_per_c - m.se)} />
                    </g>
                  )}
                  <text
                    x={cx}
                    y={Math.min(Y(m.slope_s_per_km_per_c), Y(m.slope_s_per_km_per_c + (m.se ?? 0))) - 6}
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    fill={last ? "#b6f35a" : "#cfccf0"}
                  >
                    {m.slope_s_per_km_per_c.toFixed(1)}
                  </text>
                </>
              ) : (
                <g>
                  <rect x={x} y={Y(0) - 14} width={bw} height={14} rx="4" fill="none" stroke="#36335f" strokeDasharray="3 3" />
                  <title>{`${monthShort(m.month)}: ${m.reason ?? "not enough data"}`}</title>
                </g>
              )}
              <text x={cx} y={H - 8} fontSize="11" fill={m.reliable ? "#9a95c4" : "#5a5680"} textAnchor="middle">
                {monthShort(m.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 text-xs text-text-muted">
        Lower is better · whiskers show ±1 standard error · dashed months lack runs or temperature variation
      </div>
    </WxCard>
  );
}
