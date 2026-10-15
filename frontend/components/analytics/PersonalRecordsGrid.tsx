import {
  agoLabel,
  formatLongDate,
  isRecent,
  LONGEST_RUN_TYPE_ID,
  PersonalRecord,
  RACE_DISTANCES,
  recordVdot,
} from "@/components/analytics/records";
import { formatDuration, formatPace } from "@/lib/format";

export interface RunRow {
  started_at: string;
  distance_km: number;
  duration_s?: number;
  vo2_max?: number | null;
}

const TROPHY = "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3";
const CARD = "relative rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]";

function Chip({ tone, children }: { tone?: "new" | "best"; children: React.ReactNode }) {
  const toneClass =
    tone === "new"
      ? "border-positive/35 bg-positive/15 text-positive"
      : tone === "best"
        ? "border-brand/35 bg-brand/15 text-[#ff8fb8]"
        : "border-border-strong bg-surface-hover text-text-soft";
  return <span className={`rounded-full border px-[9px] py-1 text-[11px] font-semibold ${toneClass}`}>{children}</span>;
}

function Foot({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-xs text-text-muted">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

/** Longest run per calendar month for the last 12 months, oldest first. */
function monthlyLongest(runs: RunRow[]): number[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return runs.reduce((max, r) => {
      const t = new Date(r.started_at).getTime();
      return t >= start.getTime() && t < end.getTime() ? Math.max(max, r.distance_km) : max;
    }, 0);
  });
}

/** Personal-records grid: one card per race distance + a wide Longest run card. */
export default function PersonalRecordsGrid({
  records,
  runs,
}: {
  records: PersonalRecord[] | null;
  runs: RunRow[] | null;
}) {
  if (!records) {
    return <div className="flex h-32 items-center justify-center text-sm text-text-muted">Loading...</div>;
  }

  const vdots = RACE_DISTANCES.map((d) => recordVdot(records.find((r) => r.type_id === d.typeId), d.meters));
  const bestVdot = Math.max(...vdots.map((v) => v ?? -Infinity));

  const longest = records.find((r) => r.type_id === LONGEST_RUN_TYPE_ID);
  const monthly = runs ? monthlyLongest(runs) : null;
  const monthlyMax = monthly ? Math.max(...monthly, 1) : 1;
  const prevBest =
    longest?.achieved_at && runs
      ? runs
          .filter((r) => new Date(r.started_at) < new Date(longest.achieved_at!))
          .reduce((max, r) => Math.max(max, r.distance_km), 0)
      : 0;

  return (
    <section className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
      {RACE_DISTANCES.map((d, i) => {
        const record = records.find((r) => r.type_id === d.typeId);
        const vdot = vdots[i];
        const isBest = vdot != null && vdot === bestVdot;
        return (
          <div
            key={d.typeId}
            className={CARD}
            style={isBest ? { boxShadow: "inset 0 3px 0 #ff4d8d, 0 8px 24px rgba(0,0,0,0.2)" } : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <svg className="h-4 w-4 text-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={TROPHY} />
                </svg>
                {d.label}
              </span>
              {record && isRecent(record.achieved_at) ? (
                <Chip tone="new">New · {agoLabel(record.achieved_at)}</Chip>
              ) : vdot != null ? (
                <Chip tone={isBest ? "best" : undefined}>
                  {isBest ? "Best " : ""}VDOT {vdot.toFixed(1)}
                </Chip>
              ) : null}
            </div>
            <div className="mb-0.5 mt-3.5 text-[38px] font-semibold tracking-tight">
              {record ? formatDuration(record.value) : "--"}
            </div>
            <div className="text-[13px] text-text-soft">
              {record ? formatPace(record.value / (d.meters / 1000)) : "No record yet"}
              {record && isRecent(record.achieved_at) && vdot != null ? ` · VDOT ${vdot.toFixed(1)}` : ""}
            </div>
            <Foot left={formatLongDate(record?.achieved_at ?? null)} right={agoLabel(record?.achieved_at ?? null)} />
          </div>
        );
      })}

      <div
        className={CARD + " sm:col-span-2"}
        style={{
          background: "radial-gradient(360px 200px at 100% 0%, rgba(56,214,255,0.14), transparent 70%), var(--color-surface)",
          boxShadow: "inset 0 3px 0 #38d6ff, 0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <svg className="h-4 w-4 text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 17l5-6 4 3 6-8 3 4" />
            </svg>
            Longest run
          </span>
          {longest && isRecent(longest.achieved_at) && <Chip tone="new">New · {agoLabel(longest.achieved_at)}</Chip>}
        </div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="mb-0.5 mt-3.5 text-[38px] font-semibold tracking-tight">
              {longest ? (longest.value / 1000).toFixed(2) : "--"}
              <span className="ml-1 text-lg font-medium text-text-muted">km</span>
            </div>
            <div className="text-[13px] text-text-soft">{formatLongDate(longest?.achieved_at ?? null)}</div>
          </div>
          {monthly && (
            <div className="flex h-[70px] w-[340px] max-w-[55%] items-end gap-1.5" aria-label="Longest run per month">
              {monthly.map((km, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[3px]"
                  style={{
                    height: `${Math.max(4, (km / monthlyMax) * 100)}%`,
                    background: i === monthly.length - 1 ? "#38d6ff" : "#3f3a72",
                  }}
                  title={`${km.toFixed(1)} km`}
                />
              ))}
            </div>
          )}
        </div>
        <Foot
          left="Longest run each month, last 12 months"
          right={
            prevBest > 0 ? (
              <>
                Previous best <b className="text-sm font-semibold text-text">{prevBest.toFixed(1)} km</b>
              </>
            ) : (
              ""
            )
          }
        />
      </div>
    </section>
  );
}
