import { EmptyPlaceholder } from "@/components/Card";

interface WeekPoint {
  week_start: string;
  distance_km: number;
  runs: number;
}

const BAR_AREA_PX = 96;

/** Consecutive weeks with at least one run, ending at the latest week. A
 * current week with no runs yet is skipped rather than breaking the streak. */
export function weeksStreak(weekly: WeekPoint[] | null): number {
  if (!weekly) return 0;
  let i = weekly.length - 1;
  if (i >= 0 && weekly[i].runs === 0) i -= 1;
  let streak = 0;
  while (i >= 0 && weekly[i].runs > 0) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

/** Runs per week over the weekly-mileage window -- "did I show up?" at a
 * glance. The current (unfinished) week is highlighted and left out of
 * the streak if it has no runs yet, so a quiet Monday doesn't read as a
 * broken streak. */
export default function ConsistencyCard({ weekly }: { weekly: WeekPoint[] | null }) {
  const lastIndex = weekly ? weekly.length - 1 : -1;
  const activeWeeks = weekly ? weekly.filter((w) => w.runs > 0).length : 0;

  const maxRuns = weekly ? Math.max(...weekly.map((w) => w.runs), 1) : 1;

  const avgRuns = weekly && weekly.length ? weekly.reduce((sum, w) => sum + w.runs, 0) / weekly.length : 0;
  const quietWeeks = weekly ? weekly.slice(-2).filter((w) => w.runs <= 1).length : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-blue" />
          Runs per week
        </div>
        {weekly && <span className="text-xs text-text-muted">Last {weekly.length} weeks</span>}
      </div>

      {!weekly ? (
        <EmptyPlaceholder label="Loading..." />
      ) : (
        <>
          <div className="flex items-end gap-1.5" role="img" aria-label="Runs per week">
            {weekly.map((w, i) => {
              const label = new Date(w.week_start).toLocaleDateString(undefined, { month: "short", day: "numeric" });
              const isCurrent = i === lastIndex;
              return (
                <div key={w.week_start} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="flex w-full items-end"
                    style={{ height: BAR_AREA_PX }}
                    title={`Week of ${label}: ${w.runs} ${w.runs === 1 ? "run" : "runs"}, ${w.distance_km.toFixed(1)} km`}
                  >
                    <div
                      className={
                        "w-full rounded-md " +
                        (w.runs === 0
                          ? "bg-border"
                          : isCurrent
                            ? "bg-[linear-gradient(#ff4d8d,#ff7a45)]"
                            : "bg-[#3f3a72]")
                      }
                      style={{ height: w.runs === 0 ? 3 : Math.max(8, (w.runs / maxRuns) * BAR_AREA_PX) }}
                    />
                  </div>
                  <span className={"text-[11px] " + (isCurrent ? "font-medium text-text" : "text-text-muted")}>{w.runs}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-text-muted">
            <span>
              Avg <b className="font-semibold text-text">{avgRuns.toFixed(1)}</b> runs/wk · {activeWeeks}/{weekly.length} weeks with a run
            </span>
            {quietWeeks === 2 && <span>Quiet for 2 weeks</span>}
          </div>
        </>
      )}
    </div>
  );
}
