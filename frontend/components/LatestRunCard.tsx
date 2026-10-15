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

function Metric({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="sm:pl-[18px]">
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {children}
    </div>
  );
}

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

/** Most recent run, with its pace set against your previous few runs of
 * the same type (your own baseline, not anyone else's). `activities` is
 * GET /api/activities, newest first. */
export default function LatestRunCard({ activities }: { activities: LatestRunActivity[] | null }) {
  const latest = activities?.[0];

  const earlier = latest
    ? (activities ?? [])
        .slice(1)
        .filter((a) => a.activity_type === latest.activity_type && a.avg_pace_s_per_km != null)
        .slice(0, COMPARE_RUNS)
    : [];
  const baselinePace = earlier.length
    ? earlier.reduce((sum, a) => sum + (a.avg_pace_s_per_km as number), 0) / earlier.length
    : null;
  const paceDiff =
    latest?.avg_pace_s_per_km != null && baselinePace != null ? latest.avg_pace_s_per_km - baselinePace : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-brand" />
          Latest run
          {latest && (
            <span className="font-normal text-text-muted">
              · {relativeDay(latest.started_at)} · {latest.activity_type === "treadmill_running" ? "Treadmill" : "Outdoor"}
            </span>
          )}
        </div>
        <a href="/activities" className="text-xs text-text-soft hover:text-text">
          View details &rarr;
        </a>
      </div>

      {!activities ? (
        <EmptyPlaceholder label="Loading..." />
      ) : !latest ? (
        <EmptyPlaceholder label='No runs yet -- press "Sync".' />
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="text-5xl font-semibold tracking-tight tabular-nums">
            {latest.distance_km.toFixed(2)}
            <span className="ml-1 text-[15px] font-medium text-text-muted">km</span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-y-4 sm:grid-cols-4 sm:border-l sm:border-border">
            <Metric label="Pace" value={formatPace(latest.avg_pace_s_per_km)}>
              {paceDiff == null ? null : Math.abs(paceDiff) < 2 ? (
                <span className="text-xs text-text-muted">In line with last {earlier.length}</span>
              ) : (
                <span className={"text-xs " + (paceDiff < 0 ? "text-positive" : "text-negative")}>
                  {paceDiff < 0 ? "↑" : "↓"} {Math.round(Math.abs(paceDiff))}s vs last {earlier.length}
                </span>
              )}
            </Metric>
            <Metric label="Time" value={formatDuration(latest.duration_s)}>
              <span className="text-xs text-text-muted">moving</span>
            </Metric>
            <Metric label="Avg HR" value={latest.avg_hr != null ? `${Math.round(latest.avg_hr)} bpm` : "--"} />
            <Metric label="Cadence" value={latest.avg_cadence != null ? `${Math.round(latest.avg_cadence)} spm` : "--"} />
          </div>
        </div>
      )}
    </div>
  );
}
