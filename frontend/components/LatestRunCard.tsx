import { EmptyPlaceholder } from "@/components/Card";
import { formatDuration, formatPace } from "@/lib/format";

export interface LatestRunActivity {
  id: string;
  started_at: string;
  distance_km: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  avg_cadence: number | null;
  activity_type: string | null;
}

const COMPARE_RUNS = 5;

/** "Today" / "Yesterday" / "3 days ago" / a short date once it's over a week old. */
function relativeDay(iso: string): string {
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SHOWN_RUNS = 3;

/** Pace of `activities[i]` against the mean of the (up to COMPARE_RUNS) earlier
 * runs of the same type, in s/km. Negative = faster. null when there's no baseline. */
function paceDiffAt(activities: LatestRunActivity[], i: number): { diff: number; n: number } | null {
  const run = activities[i];
  if (run.avg_pace_s_per_km == null) return null;
  const earlier = activities
    .slice(i + 1)
    .filter((a) => a.activity_type === run.activity_type && a.avg_pace_s_per_km != null)
    .slice(0, COMPARE_RUNS);
  if (earlier.length === 0) return null;
  const baseline = earlier.reduce((sum, a) => sum + (a.avg_pace_s_per_km as number), 0) / earlier.length;
  return { diff: run.avg_pace_s_per_km - baseline, n: earlier.length };
}

const COLS = "grid grid-cols-[minmax(0,1.3fr)_0.9fr_1fr_0.9fr_0.7fr] items-center gap-x-2";

/** The last few runs as compact rows; each pace is set against your previous
 * few runs of the same type (your own baseline, not anyone else's).
 * `activities` is GET /api/activities, newest first. */
export default function LatestRunCard({ activities }: { activities: LatestRunActivity[] | null }) {
  const runs = activities?.slice(0, SHOWN_RUNS) ?? [];

  return (
    <div className="rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-brand" />
          Latest runs
          <span className="font-normal text-text-muted">· last {SHOWN_RUNS}</span>
        </div>
        <a href="/activities" className="text-xs text-text-soft hover:text-text">
          View details &rarr;
        </a>
      </div>

      {!activities ? (
        <EmptyPlaceholder label="Loading..." />
      ) : runs.length === 0 ? (
        <EmptyPlaceholder label='No runs yet -- press "Sync".' />
      ) : (
        <>
          <div className={COLS + " mb-1 px-3 text-[10px] uppercase tracking-wider text-text-muted"}>
            <span>When</span>
            <span>Dist</span>
            <span>Pace</span>
            <span>Time</span>
            <span className="text-right">HR</span>
          </div>
          <div className="flex flex-col gap-2">
            {runs.map((run, i) => {
              const d = paceDiffAt(activities, i);
              const treadmill = run.activity_type === "treadmill_running";
              return (
                <div
                  key={run.id}
                  className={
                    COLS +
                    " rounded-xl border px-3 py-2.5 " +
                    (i === 0 ? "border-brand/30 bg-brand/10" : "border-border bg-surface-hover")
                  }
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{relativeDay(run.started_at)}</div>
                    <div className={"text-[11px] " + (treadmill ? "text-violet" : "text-blue")}>
                      {treadmill ? "Treadmill" : "Outdoor"}
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold tabular-nums">
                    {run.distance_km.toFixed(2)}
                    <span className="ml-0.5 text-[10px] font-medium text-text-muted">km</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold tabular-nums">
                      {formatPace(run.avg_pace_s_per_km).replace("/km", "")}
                    </div>
                    {d && Math.abs(d.diff) >= 2 ? (
                      <div className={"text-[10.5px] " + (d.diff < 0 ? "text-positive" : "text-negative")}>
                        {d.diff < 0 ? "↑" : "↓"} {Math.round(Math.abs(d.diff))}s
                      </div>
                    ) : (
                      <div className="text-[10.5px] text-text-muted">{d ? "on par" : ""}</div>
                    )}
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums">{formatDuration(run.duration_s)}</div>
                  <div className="text-right text-[13px] font-semibold tabular-nums">
                    {run.avg_hr != null ? Math.round(run.avg_hr) : "--"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 text-[11px] text-text-muted">
            Pace arrows compare with your previous 5 runs of the same type
          </div>
        </>
      )}
    </div>
  );
}
