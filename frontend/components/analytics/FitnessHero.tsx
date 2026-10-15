import { CardTitle, InfoTip } from "@/components/Card";
import type { RunRow } from "@/components/analytics/PersonalRecordsGrid";
import {
  PersonalRecord,
  RACE_DISTANCES,
  recordVdot,
} from "@/components/analytics/records";
import { formatDuration } from "@/lib/format";
import { equivalentTimeS } from "@/lib/vdot";

const TREND_MONTHS = 6;

/** Garmin's per-run VO2max estimate, reduced to the latest reading in each of the last 6 calendar
 * months (current month included); months with no reading are skipped. `slot` is the month's
 * position 0..5 along the x-axis, `month` its 0-11 number for labelling. */
function monthlyVo2max(
  runs: RunRow[],
): { slot: number; month: number; vdot: number }[] {
  const now = new Date();
  const latest = new Map<number, { t: number; v: number }>();
  for (const r of runs) {
    if (r.vo2_max == null) continue;
    const d = new Date(r.started_at);
    const slot =
      TREND_MONTHS -
      1 -
      ((now.getFullYear() - d.getFullYear()) * 12 +
        now.getMonth() -
        d.getMonth());
    if (slot < 0 || slot >= TREND_MONTHS) continue;
    const prev = latest.get(slot);
    if (!prev || d.getTime() > prev.t)
      latest.set(slot, { t: d.getTime(), v: r.vo2_max });
  }
  return [...latest.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slot, { v }]) => ({
      slot,
      month: (now.getMonth() - (TREND_MONTHS - 1 - slot) + 12) % 12,
      vdot: v,
    }));
}

const TREND_W = 560;
const TREND_H = 90;
const monthName = (m: number) =>
  new Date(2000, m, 1).toLocaleDateString(undefined, { month: "short" });

function VdotTrend({
  series,
}: {
  series: { slot: number; month: number; vdot: number }[];
}) {
  const lo = Math.floor(Math.min(...series.map((p) => p.vdot)));
  const hi = Math.max(
    lo + 1,
    Math.ceil(Math.max(...series.map((p) => p.vdot))),
  );
  const y = (v: number) => 30 + ((hi - v) / (hi - lo)) * 40;
  const x = (slot: number) => 30 + (slot / (TREND_MONTHS - 1)) * 450;
  const peak = series.reduce((a, b) => (b.vdot > a.vdot ? b : a));
  const path = series
    .map((p, i) => `${i ? "L" : "M"}${x(p.slot)} ${y(p.vdot)}`)
    .join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${TREND_W} ${TREND_H}`}
      className="mt-2"
      role="img"
      aria-label="VO2max trend"
    >
      <g stroke="rgba(255,255,255,.08)">
        <line x1="0" x2={TREND_W} y1="30" y2="30" />
        <line x1="0" x2={TREND_W} y1="70" y2="70" />
      </g>
      <g fontSize="10" fill="#9a95c4">
        <text x="0" y="27">
          {hi}
        </text>
        <text x="0" y="66">
          {lo}
        </text>
      </g>
      <path
        d={path}
        fill="none"
        stroke="#a27bff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {series.map((p) => {
        const isPeak = p === peak;
        return (
          <g key={p.slot}>
            <circle
              cx={x(p.slot)}
              cy={y(p.vdot)}
              r={isPeak ? 5 : 3.5}
              fill={isPeak ? "#ff4d8d" : "#a27bff"}
            />
            <text
              x={x(p.slot)}
              y={y(p.vdot) - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={isPeak ? "#ff8fb8" : "#cfccf0"}
            >
              {p.vdot.toFixed(0)}
            </text>
          </g>
        );
      })}
      <g fontSize="10" fill="#9a95c4" textAnchor="middle">
        {series.map((p) => (
          <text key={p.slot} x={x(p.slot)} y="86">
            {monthName(p.month)}
          </text>
        ))}
      </g>
    </svg>
  );
}

const PRED_TYPE_IDS = [3, 4, 5, 6]; // 5 km, 10 km, Half, Marathon
const SCALE_MIN = 20; // VDOT mapped to 0% / 100% of the track
const SCALE_MAX = 40;
const pct = (v: number) =>
  Math.max(0, Math.min(100, ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

/** Hero row: current VDOT + equivalent race times (left), VDOT by distance (right). */
export default function FitnessHero({
  records,
  runs,
}: {
  records: PersonalRecord[] | null;
  runs: RunRow[] | null;
}) {
  const rows = RACE_DISTANCES.map((d) => {
    const record = records?.find((r) => r.type_id === d.typeId);
    return { ...d, record, vdot: recordVdot(record, d.meters) };
  });
  const scored = rows.filter((r) => r.vdot != null);
  const peak = scored.length
    ? scored.reduce((a, b) => (b.vdot! > a.vdot! ? b : a))
    : null;

  const trend = runs ? monthlyVo2max(runs) : null;
  const sinceDelta =
    trend && trend.length >= 2
      ? trend[trend.length - 1].vdot - trend[0].vdot
      : null;

  return (
    <section className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1.7fr]">
      <div
        className="relative overflow-hidden rounded-2xl border border-violet/30 p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        style={{
          background:
            "radial-gradient(500px 260px at 0% 0%, rgba(122,92,255,0.24), transparent 65%), radial-gradient(400px 240px at 100% 100%, rgba(255,77,141,0.14), transparent 65%), #17143a",
        }}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <CardTitle accent="var(--color-violet)">Running fitness</CardTitle>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-text-soft">
            What is VDOT?
            <InfoTip>
              VDOT is Jack Daniels' fitness number: the VO2max a race time is
              equivalent to. It adjusts for distance, so a 5 km and a marathon
              share one scale.
            </InfoTip>
          </span>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
          {peak ? `Current VDOT · from your ${peak.label} PR` : "Current VDOT"}
        </div>
        <div className="mb-1.5 mt-2.5 flex items-baseline gap-2.5">
          <b className="text-[84px] font-semibold leading-[0.95] tracking-[-0.04em]">
            {peak ? peak.vdot!.toFixed(1) : "--"}
          </b>
        </div>
        <div className="text-[13px] text-text-soft">
          Equivalent race times at this fitness level:
        </div>
        <div className="mt-[22px] grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PRED_TYPE_IDS.map((typeId) => {
            const row = rows.find((r) => r.typeId === typeId)!;
            const eq = peak ? equivalentTimeS(peak.vdot!, row.meters) : null;
            const pr = row.record?.value ?? null;
            const lagging = eq != null && pr != null && pr > eq * 1.03;
            const matched = peak?.typeId === typeId;
            return (
              <div
                key={typeId}
                className="rounded-xl border bg-bg/35 px-3.5 py-3"
                style={{
                  borderColor: lagging
                    ? "rgba(255,185,56,0.4)"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                <small className="block text-[11px] uppercase tracking-[0.06em] text-text-muted">
                  {row.label === "Half Marathon" ? "Half" : row.label}
                </small>
                <b
                  className={
                    "mb-0.5 mt-1.5 block text-xl font-semibold " +
                    (lagging ? "text-amber" : "")
                  }
                >
                  {eq != null ? formatDuration(eq) : "--"}
                </b>
                <span className="text-xs text-text-muted">
                  {pr == null
                    ? "No PR"
                    : matched
                      ? "PR · matched"
                      : `PR ${formatDuration(pr)}`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-[22px] flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
            VO2max trend · last 6 months
          </span>
          <span className="text-xs text-text-muted">
            {sinceDelta != null ? (
              <span
                className={sinceDelta >= 0 ? "text-positive" : "text-brand"}
              >
                {sinceDelta >= 0 ? "↑" : "↓"} {Math.abs(sinceDelta).toFixed(0)}{" "}
                since {monthName(trend![0].month)}
              </span>
            ) : null}
          </span>
        </div>
        {trend && trend.length >= 2 ? (
          <VdotTrend series={trend} />
        ) : (
          <div className="mt-2 flex h-[90px] items-center justify-center rounded-xl border border-dashed border-border text-xs text-text-muted">
            {trend
              ? "Not enough VO2max readings in the last 6 months"
              : "Loading..."}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-2">
          <CardTitle accent="var(--color-brand)">VDOT by distance</CardTitle>
          <div className="flex gap-3.5 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[3px] w-2.5 rounded-sm bg-[linear-gradient(90deg,#a27bff,#ff4d8d)]" />
              Best
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[3px] w-2.5 rounded-sm bg-[linear-gradient(90deg,#ff7a45,#ffb938)]" />
              Under potential
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[3px] w-2.5 rounded-sm bg-positive" />
              Your peak {peak ? peak.vdot!.toFixed(1) : "--"}
            </span>
          </div>
        </div>
        {!records ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-text-muted">
            Loading...
          </div>
        ) : (
          rows.map((r) => {
            const isBest = peak?.typeId === r.typeId;
            const weak =
              r.vdot != null && peak != null && peak.vdot! - r.vdot > 3;
            return (
              <div
                key={r.typeId}
                className="grid h-10 grid-cols-[120px_1fr_64px] items-center gap-3.5"
              >
                <span className="text-[13px] text-text-soft">{r.label}</span>
                <div className="relative h-3.5 rounded-full bg-surface-hover">
                  {r.vdot != null && (
                    <div
                      className={
                        "absolute inset-y-0 left-0 rounded-full " +
                        (isBest
                          ? "bg-[linear-gradient(90deg,#a27bff,#ff4d8d)]"
                          : weak
                            ? "bg-[linear-gradient(90deg,#ff7a45,#ffb938)]"
                            : "bg-[#3f3a72]")
                      }
                      style={{ width: `${pct(r.vdot)}%` }}
                    />
                  )}
                  {peak && (
                    <div
                      className="absolute -bottom-1.5 -top-1.5 w-0 border-l-[1.5px] border-dashed border-positive"
                      style={{ left: `${pct(peak.vdot!)}%` }}
                    />
                  )}
                </div>
                <span
                  className={
                    "text-right text-[15px] font-semibold " +
                    (weak ? "text-amber" : "")
                  }
                  style={isBest ? { color: "#ff8fb8" } : undefined}
                >
                  {r.vdot != null ? r.vdot.toFixed(1) : "--"}
                </span>
              </div>
            );
          })
        )}
        {/* TODO: insight sentence (e.g. endurance gap vs speed) needs the coach/insight pipeline. */}
        <div className="mt-[18px] flex gap-3 rounded-xl border border-amber/20 border-l-[3px] border-l-amber bg-amber/[0.07] p-3.5">
          <div className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[linear-gradient(135deg,#ffb938,#ff7a45)] text-[#1a1030]">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3M9 16a3 3 0 116 0v2H9z" />
            </svg>
          </div>
          <div>
            <h4 className="mb-[3px] text-sm font-semibold">Insight</h4>
            <p className="text-[12.5px] leading-[1.55] text-text-soft">
              Distances with a lower VDOT than your peak show where fitness is
              lagging (usually endurance). Written insights aren&apos;t
              generated yet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
