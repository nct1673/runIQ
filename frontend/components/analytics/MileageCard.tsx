"use client";

import { useEffect, useMemo, useState } from "react";

interface WeeklyPoint {
  week_start: string;
  distance_km: number;
  runs: number;
}
interface MonthlyPoint {
  month_start: string;
  distance_km: number;
  runs: number;
}
interface RaceRow {
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
  status: string;
}

type View = "weekly" | "monthly";

/** One chart bar, normalised from either endpoint. */
interface Bucket {
  key: string;
  start: Date;
  end: Date; // inclusive last day
  km: number;
  runs: number;
  axis: string; // x label
  raceKm: number;
  raceNames: string[];
}

const PLOT_H = 210;
const BAR_MUTED = "#3f3a72";

const parseDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monthShort = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
const monthLong = (d: Date) => d.toLocaleDateString(undefined, { month: "long" });

function fmtRange(a: Date, b: Date): string {
  return a.getMonth() === b.getMonth()
    ? `${monthShort(a)} ${a.getDate()}–${b.getDate()}`
    : `${monthShort(a)} ${a.getDate()} – ${monthShort(b)} ${b.getDate()}`;
}

/** Weekly labels: whole numbers once past 10 km, one decimal below. */
function fmtBarKm(km: number, view: View): string {
  if (view === "monthly") return km.toFixed(1);
  return km >= 10 ? String(Math.round(km)) : String(Number(km.toFixed(1)));
}

/** Smallest "round" step that fits the data in <= 5 grid rows. */
function niceScale(max: number): { top: number; ticks: number[] } {
  const step = [5, 10, 20, 25, 50, 100, 200, 500].find((s) => Math.ceil(max / s) <= 5) ?? 1000;
  const top = Math.max(1, Math.ceil(max / step)) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

function raceWord(km: number): string {
  if (Math.abs(km - 42.195) < 0.5) return "marathon";
  if (Math.abs(km - 21.0975) < 0.4) return "half marathon";
  if (Math.abs(km - 10) < 0.2) return "10K";
  if (Math.abs(km - 5) < 0.2) return "5K";
  return "";
}

function raceLine(b: Bucket, races: RaceRow[]): string | null {
  const inBucket = races.filter((r) => {
    const d = parseDay(r.race_date);
    return d >= b.start && d <= b.end;
  });
  if (inBucket.length === 0) return null;
  return inBucket
    .map((r) => {
      const short = r.name.replace(/\s*20\d\d$/, "");
      const word = raceWord(r.distance_km);
      return `${short}${word ? ` ${word}` : ""} ${r.distance_km.toFixed(1)} km`;
    })
    .join(" · ");
}

function withRaces(rows: Omit<Bucket, "raceKm" | "raceNames">[], races: RaceRow[]): Bucket[] {
  return rows.map((b) => {
    const hit = races.filter((r) => {
      const d = parseDay(r.race_date);
      return d >= b.start && d <= b.end;
    });
    return { ...b, raceKm: hit.reduce((s, r) => s + r.distance_km, 0), raceNames: hit.map((r) => r.name) };
  });
}

function Stat({
  label,
  value,
  unit,
  sub,
  first,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  first?: boolean;
}) {
  return (
    <div className={first ? "pr-7" : "border-l border-border px-7"}>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1.5 text-[28px] font-semibold leading-none">
        {value}
        <span className="ml-1.5 text-[14px] font-medium text-text-muted">{unit}</span>
      </div>
      <div className="mt-2 text-[12.5px] text-text-muted">{sub}</div>
    </div>
  );
}

/** Analytics "Mileage" card: weekly / monthly bars with summary stats, the
 * average line, race distance and the in-progress bucket marked. */
export default function MileageCard() {
  const [weekly, setWeekly] = useState<WeeklyPoint[] | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[] | null>(null);
  const [races, setRaces] = useState<RaceRow[]>([]);
  const [view, setView] = useState<View>("weekly");
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/analytics/weekly-mileage?weeks=10")
      .then((res) => (res.ok ? res.json() : null))
      .then(setWeekly)
      .catch(() => setWeekly(null));
    fetch("/api/analytics/monthly-mileage?months=12")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMonthly)
      .catch(() => setMonthly(null));
    fetch("/api/races")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: RaceRow[]) => setRaces(rows.filter((r) => r.status === "completed")))
      .catch(() => setRaces([]));
  }, []);

  const buckets: Bucket[] | null = useMemo(() => {
    if (view === "weekly") {
      if (!weekly) return null;
      return withRaces(
        weekly.map((w) => {
          const start = parseDay(w.week_start);
          return {
            key: w.week_start,
            start,
            end: addDays(start, 6),
            km: w.distance_km,
            runs: w.runs,
            axis: `${monthShort(start)} ${start.getDate()}`,
          };
        }),
        races,
      );
    }
    if (!monthly) return null;
    return withRaces(
      monthly.map((m) => {
        const start = parseDay(m.month_start);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        return { key: m.month_start, start, end, km: m.distance_km, runs: m.runs, axis: monthShort(start) };
      }),
      races,
    );
  }, [view, weekly, monthly, races]);

  const stats = useMemo(() => {
    if (!buckets || buckets.length === 0) return null;
    const cur = buckets[buckets.length - 1];
    const peak = buckets.reduce((best, b) => (b.km > best.km ? b : best), buckets[0]);

    if (view === "weekly") {
      const last4 = buckets.slice(-4);
      const prev4 = buckets.slice(-8, -4);
      const avg4 = last4.reduce((s, b) => s + b.km, 0) / last4.length;
      const prevAvg = prev4.length === 4 ? prev4.reduce((s, b) => s + b.km, 0) / 4 : 0;
      const delta = prevAvg > 0 ? ((avg4 - prevAvg) / prevAvg) * 100 : null;
      const avgAll = buckets.reduce((s, b) => s + b.km, 0) / buckets.length;
      return {
        avgLine: avgAll,
        avgLabel: null as string | null,
        items: [
          {
            label: "This week",
            value: cur.km.toFixed(1),
            sub: `${cur.runs} run${cur.runs === 1 ? "" : "s"} · ${fmtRange(cur.start, cur.end)}`,
          },
          {
            label: "4-week avg",
            value: avg4.toFixed(1),
            sub:
              delta == null
                ? "Not enough history"
                : `${delta < 0 ? "−" : "+"}${Math.abs(Math.round(delta))}% vs previous 4 wks`,
          },
          { label: "Peak week", value: peak.km.toFixed(1), sub: fmtRange(peak.start, peak.end) },
        ],
        peak,
        footnote: "Weeks run Mon–Sun",
      };
    }

    const done = buckets.slice(0, -1).filter((b) => b.runs > 0);
    const avg = done.length ? done.reduce((s, b) => s + b.km, 0) / done.length : 0;
    const first = done[0];
    const lastDone = done[done.length - 1];
    const range =
      first && lastDone
        ? first.start.getFullYear() === lastDone.start.getFullYear()
          ? `${monthShort(first.start)} – ${monthShort(lastDone.start)} ${lastDone.start.getFullYear()}`
          : `${monthShort(first.start)} ${first.start.getFullYear()} – ${monthShort(lastDone.start)} ${lastDone.start.getFullYear()}`
        : "No completed months";
    const empty = buckets.slice(0, -1).filter((b) => b.runs === 0);
    const footnote =
      empty.length === 0
        ? ""
        : `${monthShort(empty[0].start)}${empty.length > 1 ? `–${monthShort(empty[empty.length - 1].start)}` : ""} ${empty[empty.length - 1].start.getFullYear()}: no runs recorded`;
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return {
      avgLine: avg,
      avgLabel: done.length ? `Avg ${Math.round(avg)} km (${range.replace(/ \d{4}$/, "").replace(" – ", "–")})` : null,
      items: [
        {
          label: `${monthLong(cur.start)} so far`,
          value: cur.km.toFixed(1),
          sub: `${cur.runs} run${cur.runs === 1 ? "" : "s"} · ${today.getDate()} of ${daysInMonth} days`,
        },
        { label: "Monthly avg", value: avg.toFixed(1), sub: range },
        {
          label: "Best month",
          value: peak.km.toFixed(1),
          sub: `${monthLong(peak.start)} · ${peak.runs} run${peak.runs === 1 ? "" : "s"}`,
        },
      ],
      peak,
      footnote,
    };
  }, [buckets, view]);

  const scale = buckets ? niceScale(Math.max(...buckets.map((b) => b.km), 1)) : null;
  const lastIdx = buckets ? buckets.length - 1 : -1;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-violet" />
          Mileage
        </div>
        <div className="flex gap-0.5 rounded-xl border border-border bg-bg/40 p-[3px]">
          {(["weekly", "monthly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setHovered(null);
              }}
              className={
                "rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold capitalize " +
                (view === v ? "bg-[#2d2a58] text-white" : "text-text-muted hover:text-text")
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {!buckets || !stats || !scale ? (
        <p className="flex h-[300px] items-center justify-center text-sm text-text-muted">Loading...</p>
      ) : (
        <>
          <div className="mt-5 flex">
            {stats.items.map((s, i) => (
              <Stat key={s.label} label={s.label} value={s.value} unit="km" sub={s.sub} first={i === 0} />
            ))}
          </div>

          <div className="mt-7 flex">
            {/* y axis */}
            <div className="relative mr-3 w-8 shrink-0" style={{ height: PLOT_H + 28 }}>
              <span className="absolute -top-[26px] right-0 text-[11px] text-text-muted">km</span>
              {scale.ticks.map((t) => (
                <span
                  key={t}
                  className="absolute right-0 -translate-y-1/2 text-[11.5px] text-text-muted"
                  style={{ top: PLOT_H - (t / scale.top) * PLOT_H }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1" style={{ height: PLOT_H + 28 }}>
              {scale.ticks.map((t) => (
                <div
                  key={t}
                  className="absolute inset-x-0 border-t border-border"
                  style={{ top: PLOT_H - (t / scale.top) * PLOT_H }}
                />
              ))}

              {stats.avgLine > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-positive/70"
                  style={{ top: PLOT_H - (stats.avgLine / scale.top) * PLOT_H }}
                >
                  {stats.avgLabel && (
                    <span className="absolute -top-[19px] left-3 text-[12px] font-medium text-positive">
                      {stats.avgLabel}
                    </span>
                  )}
                </div>
              )}

              <div className="absolute inset-x-0 top-0 flex" style={{ height: PLOT_H + 28 }}>
                {buckets.map((b, i) => {
                  const active = hovered === i;
                  const inProgress = i === lastIdx;
                  const h = b.km > 0 ? Math.max(4, (b.km / scale.top) * PLOT_H) : 3;
                  const raceH = b.raceKm > 0 ? Math.min(h, (Math.min(b.raceKm, b.km) / scale.top) * PLOT_H) : 0;
                  return (
                    <div
                      key={b.key}
                      className="relative flex-1"
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered((v) => (v === i ? null : v))}
                    >
                      <div className="absolute inset-x-0 flex flex-col items-center" style={{ bottom: 28 }}>
                        {b.km > 0 && (
                          <span
                            className={
                              "mb-1 text-[12.5px] " +
                              (active || inProgress ? "font-semibold text-white" : "text-text-muted")
                            }
                          >
                            {active ? b.km.toFixed(1) : fmtBarKm(b.km, view)}
                          </span>
                        )}
                        {b.raceKm > 0 && (
                          <span className="mb-1 grid h-[22px] w-[22px] place-items-center rounded-full bg-amber text-[11px]">
                            🏁
                          </span>
                        )}
                        <div
                          className={
                            "relative w-[56%] max-w-[100px] overflow-hidden rounded-[8px] " +
                            (inProgress && !active ? "border border-dashed border-violet" : "")
                          }
                          style={{
                            height: h,
                            background: active
                              ? "linear-gradient(180deg,#a27bff,#ff4d8d)"
                              : inProgress
                                ? "repeating-linear-gradient(135deg,rgba(162,123,255,0.5) 0 4px,transparent 4px 8px)"
                                : BAR_MUTED,
                            boxShadow: active && b.raceKm > 0 ? "inset 0 0 0 3px #ff4d8d" : undefined,
                          }}
                        >
                          {raceH > 0 && (
                            <div
                              className="absolute inset-x-0 bottom-0 bg-amber"
                              style={{ height: raceH, opacity: inProgress && !active ? 0.7 : 1 }}
                            />
                          )}
                        </div>
                      </div>
                      <span
                        className={
                          "absolute inset-x-0 bottom-0 text-center text-[13px] " +
                          (active || inProgress ? "font-semibold text-white" : "text-text-muted")
                        }
                      >
                        {b.axis}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hovered != null && (
                <div
                  className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-xl border border-border-strong bg-surface-hover px-3.5 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.4)]"
                  style={{
                    left: `${((hovered + 0.5) / buckets.length) * 100}%`,
                    transform: hovered < buckets.length / 2 ? "translateX(34px)" : "translateX(calc(-100% - 34px))",
                  }}
                >
                  <div className="text-[12.5px] text-text-muted">
                    {view === "weekly"
                      ? fmtRange(buckets[hovered].start, buckets[hovered].end)
                      : `${monthLong(buckets[hovered].start)} ${buckets[hovered].start.getFullYear()}`}
                  </div>
                  <div className="mt-0.5 text-[14.5px] font-semibold">
                    {buckets[hovered].km.toFixed(1)} km · {buckets[hovered].runs} run
                    {buckets[hovered].runs === 1 ? "" : "s"}
                  </div>
                  {raceLine(buckets[hovered], races) && (
                    <div className="mt-0.5 text-[12.5px] text-amber">incl. {raceLine(buckets[hovered], races)}</div>
                  )}
                  {!raceLine(buckets[hovered], races) &&
                    buckets[hovered].key === stats.peak.key &&
                    buckets[hovered].km > 0 && (
                      <div className="mt-0.5 text-[12.5px] text-positive">
                        {view === "weekly" ? "Peak week" : "Best month so far"}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-text-muted">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-[3px]" style={{ background: BAR_MUTED }} />
                {view === "weekly" ? "Week" : "Month"}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-violet bg-[repeating-linear-gradient(135deg,rgba(162,123,255,0.5)_0_2px,transparent_2px_4px)]" />
                In progress
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-[3px] bg-amber" />
                Race distance
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-[2px] w-3.5 rounded-sm bg-positive" />
                Average
              </span>
            </div>
            <span>{stats.footnote}</span>
          </div>
        </>
      )}
    </div>
  );
}
