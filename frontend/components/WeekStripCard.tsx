"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyPlaceholder } from "@/components/Card";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { UpcomingRaces } from "@/components/NextRaceCard";
import { formatPace } from "@/lib/format";

export interface WeekRun {
  started_at: string;
  distance_km: number;
  duration_s?: number;
  activity_type?: string | null;
  hr_time_in_zone_1?: number | null;
  hr_time_in_zone_2?: number | null;
  hr_time_in_zone_3?: number | null;
  hr_time_in_zone_4?: number | null;
  hr_time_in_zone_5?: number | null;
}
export interface WeekRace {
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
}

interface PlannedRun {
  id: string;
  planned_date: string; // "YYYY-MM-DD"
  run_type: string;
  distance_km: number;
}

const PLAN_TYPES = ["Easy", "Long", "Tempo", "Intervals", "Recovery"];
const MAX_WEEKS_AHEAD = 26;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mon-Sun strip for a week (this week by default, step back/forward with
 * the chevrons): done runs, planned runs you add to future days, races, and
 * a progress line (done km out of done + still-planned km), with the
 * next two races underneath. */
export default function WeekStripCard({ runs, races }: { runs: WeekRun[] | null; races: WeekRace[] | null }) {
  const [weeksBack, setWeeksBack] = useState(0); // 0 = this week, negative = upcoming weeks (to plan ahead)
  const [plans, setPlans] = useState<PlannedRun[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // day key of the tile being planned
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7) - weeksBack * 7,
  );
  const days = Array.from(
    { length: 7 },
    (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  );
  const todayKey = key(today);
  const startKey = key(days[0]);
  const endKey = key(days[6]);

  const loadPlans = useCallback(() => {
    fetch(`/api/planned-runs?start=${startKey}&end=${endKey}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [startKey, endKey]);

  useEffect(() => {
    setEditing(null);
    loadPlans();
  }, [loadPlans]);

  async function savePlan(dayKey: string, existing: PlannedRun | undefined, run_type: string, distance_km: number) {
    setError(null);
    try {
      const res = existing
        ? await fetch(`/api/planned-runs/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ run_type, distance_km }),
          })
        : await fetch("/api/planned-runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planned_date: dayKey, run_type, distance_km }),
          });
      if (!res.ok) throw new Error(await res.text());
      setEditing(null);
      loadPlans();
    } catch (err) {
      setError(`Couldn't save plan: ${(err as Error).message}`);
    }
  }

  async function removePlan(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/planned-runs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setEditing(null);
      loadPlans();
    } catch (err) {
      setError(`Couldn't remove plan: ${(err as Error).message}`);
    }
  }

  // ---- per-day aggregates -------------------------------------------------
  const done = new Map<
    string,
    { km: number; secs: number; count: number; treadmill: boolean; easy: number; hard: number }
  >();
  for (const r of runs ?? []) {
    const k = r.started_at.slice(0, 10);
    const d = done.get(k) ?? { km: 0, secs: 0, count: 0, treadmill: false, easy: 0, hard: 0 };
    d.km += r.distance_km;
    d.secs += r.duration_s ?? 0;
    d.count += 1;
    d.treadmill = r.activity_type === "treadmill_running";
    d.easy += (r.hr_time_in_zone_1 ?? 0) + (r.hr_time_in_zone_2 ?? 0);
    d.hard += (r.hr_time_in_zone_3 ?? 0) + (r.hr_time_in_zone_4 ?? 0) + (r.hr_time_in_zone_5 ?? 0);
    done.set(k, d);
  }
  const raceByDay = new Map<string, WeekRace>();
  for (const r of races ?? []) raceByDay.set(r.race_date, r);
  const planByDay = new Map<string, PlannedRun>();
  for (const p of plans) planByDay.set(p.planned_date, p);

  // ---- week progress: done km out of (done + still-planned) km ---------------
  const weekKeys = days.map(key);
  const doneKm = weekKeys.reduce((s, k) => s + (done.get(k)?.km ?? 0), 0);
  const doneRuns = weekKeys.filter((k) => done.has(k)).length;
  const pending = plans.filter((p) => !done.has(p.planned_date));
  const toGoKm = pending.reduce((s, p) => s + p.distance_km, 0);
  const goalKm = doneKm + toGoKm;
  const totalRuns = doneRuns + pending.length;

  const title =
    weeksBack === 0
      ? "This week"
      : weeksBack === 1
        ? "Last week"
        : weeksBack > 1
          ? `${weeksBack} weeks ago`
          : weeksBack === -1
            ? "Next week"
            : `In ${-weeksBack} weeks`;

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <i className="inline-block h-2 w-2 rounded-full bg-positive" />
            {title}
          </div>
          {goalKm > 0 && (
            <>
              <span className="shrink-0 text-xs text-text-muted">
                <b className="text-sm font-semibold text-text">{doneKm.toFixed(1)}</b> / {goalKm.toFixed(0)} km
              </span>
              <div className="h-1.5 min-w-[60px] max-w-[200px] flex-1 rounded-full bg-surface-hover">
                <i
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#38d6ff,#b6f35a)]"
                  style={{ width: `${Math.min(100, (doneKm / goalKm) * 100)}%` }}
                />
              </div>
              <span className="hidden truncate text-xs text-text-muted md:block">
                <b className="font-semibold text-text">{doneRuns}</b> of {totalRuns} run{totalRuns === 1 ? "" : "s"}
                {toGoKm > 0 && ` · ${toGoKm.toFixed(1)} km to go`}
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-xs text-text-muted">
            {fmtDay(days[0])} &ndash; {days[6].getDate()}
            {days[0].getMonth() !== days[6].getMonth()
              ? ` ${days[6].toLocaleDateString(undefined, { month: "short" })}`
              : ""}
          </span>
          <button
            type="button"
            onClick={() => setWeeksBack((w) => w + 1)}
            title="Previous week"
            aria-label="Previous week"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeeksBack((w) => Math.max(-MAX_WEEKS_AHEAD, w - 1))}
            disabled={weeksBack <= -MAX_WEEKS_AHEAD}
            title="Next week"
            aria-label="Next week"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!runs || !races ? (
        <EmptyPlaceholder label="Loading..." />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2.5">
            {days.map((d, i) => {
              const k = key(d);
              const isToday = k === todayKey;
              const isPast = k < todayKey;
              const dn = done.get(k);
              const plan = planByDay.get(k);
              const race = raceByDay.get(k);
              const canPlan = !isPast && !dn;

              let box = "border-border bg-surface-hover";
              if (isToday) box = "border-brand bg-brand/10";
              else if (dn) box = "border-positive/50 bg-positive/10";
              else if (plan) box = "border-dashed border-violet/60 bg-violet/10";
              else if (!isPast) box = "border-dashed border-border-strong bg-transparent";

              return (
                <div
                  key={k}
                  className={`group relative flex min-h-[132px] flex-col rounded-xl border px-3 pb-3 pt-2.5 ${box}`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <b className={"font-semibold tracking-wide " + (isToday ? "text-[#ff8fb8]" : "text-text-soft")}>
                      {isToday ? "TODAY" : DAYS[i]}
                    </b>
                    {dn ? (
                      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-positive text-[11px] font-bold text-[#14102a]">
                        ✓
                      </span>
                    ) : (
                      <span className="text-text-muted">{d.getDate()}</span>
                    )}
                  </div>

                  {editing === k ? (
                    <PlanEditor
                      existing={plan}
                      onSave={(type, km) => savePlan(k, plan, type, km)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : dn ? (
                    <div className="mt-2.5 flex flex-1 flex-col justify-between">
                      <div>
                        <div className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">
                          {dn.km.toFixed(1)}
                          <span className="ml-1 text-[11px] font-medium text-text-muted">km</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-text-muted">
                          {dn.secs > 0 && <>{formatPace(dn.secs / dn.km).replace("/km", "")} /km · </>}
                          {dn.count > 1 ? `${dn.count} runs` : dn.treadmill ? "Treadmill" : "Outdoor"}
                        </div>
                      </div>
                      {dn.easy + dn.hard > 0 && (
                        <div className="mt-2 flex h-[3px] gap-0.5 overflow-hidden rounded-full">
                          <i style={{ flex: dn.easy, background: "#7a6fb5" }} />
                          <i style={{ flex: dn.hard, background: "#38d6ff" }} />
                        </div>
                      )}
                    </div>
                  ) : plan ? (
                    <button
                      type="button"
                      onClick={() => setEditing(k)}
                      title="Edit this plan"
                      className="mt-2 flex flex-1 flex-col items-start text-left"
                    >
                      <span className="rounded-md bg-violet/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#c9b6ff]">
                        Planned
                      </span>
                      <span className="mt-2 text-[15px] font-semibold leading-tight">
                        {plan.run_type} {plan.distance_km % 1 === 0 ? plan.distance_km : plan.distance_km.toFixed(1)} km
                      </span>
                    </button>
                  ) : race ? (
                    <div className="mt-2 flex flex-1 flex-col justify-end text-[12px] font-semibold text-brand">
                      Race
                      <span className="truncate text-[11px] font-normal text-text-muted">{race.name}</span>
                    </div>
                  ) : canPlan ? (
                    <button
                      type="button"
                      onClick={() => setEditing(k)}
                      className="mt-2 flex flex-1 items-end gap-2 text-left text-[12px] text-text-muted hover:text-text"
                    >
                      <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-border-strong text-[13px] leading-none">
                        +
                      </span>
                      Plan a run
                    </button>
                  ) : (
                    <div className="mt-2 flex flex-1 flex-col justify-end text-[12px] text-text-muted">
                      <span className="mb-1.5 block h-px w-3.5 bg-border-strong" />
                      No run
                    </div>
                  )}

                  {plan && editing !== k && !dn && (
                    <button
                      type="button"
                      onClick={() => removePlan(plan.id)}
                      aria-label="Remove plan"
                      title="Remove plan"
                      className="absolute right-2 top-7 hidden h-5 w-5 place-items-center rounded-full text-[13px] text-text-muted hover:bg-surface-hover hover:text-negative group-hover:grid"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="mt-2 text-xs text-negative">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border pt-3.5 text-xs text-text-muted">
            <Legend swatch="border border-positive/60 bg-positive/20">Done</Legend>
            <Legend swatch="border border-brand bg-brand/20">Today</Legend>
            <Legend swatch="border border-dashed border-violet/70">Planned</Legend>
            <Legend swatch="border border-dashed border-border-strong">Open day</Legend>
            <span className="flex items-center gap-1.5">
              <i className="h-px w-3 bg-border-strong" />
              No run
            </span>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-border pt-4">
            <UpcomingRaces />
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={`h-2.5 w-3.5 rounded-[3px] ${swatch}`} />
      {children}
    </span>
  );
}

/** Inline form inside a day tile: run type + distance. */
function PlanEditor({
  existing,
  onSave,
  onCancel,
}: {
  existing?: PlannedRun;
  onSave: (type: string, km: number) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(existing?.run_type ?? "Easy");
  const [km, setKm] = useState(existing ? String(existing.distance_km) : "");
  const value = parseFloat(km);
  const valid = Number.isFinite(value) && value > 0 && value <= 500;

  return (
    <form
      className="mt-2 flex flex-1 flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(type, value);
      }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-md border border-border bg-bg px-1.5 py-1 text-[12px] text-text outline-none"
      >
        {PLAN_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        <input
          autoFocus
          inputMode="decimal"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="km"
          className="w-full min-w-0 rounded-md border border-border bg-bg px-1.5 py-1 text-[12px] text-text outline-none placeholder:text-text-muted"
        />
        <span className="text-[11px] text-text-muted">km</span>
      </div>
      <div className="mt-auto flex gap-1.5">
        <button
          type="submit"
          disabled={!valid}
          className="flex-1 rounded-md bg-white py-1 text-[11px] font-semibold text-[#14102a] disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted hover:text-text"
        >
          ✕
        </button>
      </div>
    </form>
  );
}
