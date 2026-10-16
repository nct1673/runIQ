import { EmptyPlaceholder } from "@/components/Card";
import NextRaceCard from "@/components/NextRaceCard";

export interface WeekRun {
  started_at: string;
  distance_km: number;
}
export interface WeekRace {
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mon-Sun strip for the current week (runs done, races upcoming) plus the
 * next-race card below it. */
export default function WeekStripCard({ runs, races }: { runs: WeekRun[] | null; races: WeekRace[] | null }) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const todayKey = key(today);

  const kmByDay = new Map<string, number>();
  for (const r of runs ?? []) {
    const k = r.started_at.slice(0, 10);
    kmByDay.set(k, (kmByDay.get(k) ?? 0) + r.distance_km);
  }
  const raceByDay = new Map<string, WeekRace>();
  for (const r of races ?? []) raceByDay.set(r.race_date, r);

  return (
    <div className="rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-positive" />
          This week
        </div>
      </div>

      {!runs || !races ? (
        <EmptyPlaceholder label="Loading..." />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d, i) => {
              const k = key(d);
              const km = kmByDay.get(k);
              const race = raceByDay.get(k);
              const isToday = k === todayKey;
              const isPast = k < todayKey;
              return (
                <div
                  key={k}
                  className={
                    "rounded-xl border px-1 pb-3 pt-2.5 text-center " +
                    (isToday ? "border-brand bg-brand/15" : "border-border bg-surface-hover") +
                    (!km && !race && isPast ? " opacity-60" : "")
                  }
                >
                  <small className={"block text-[11px] " + (isToday ? "text-[#ff8fb8]" : "text-text-muted")}>
                    {isToday ? "Today" : DAYS[i]}
                  </small>
                  <b className="mb-2 mt-1 block text-[17px] font-semibold">{d.getDate()}</b>
                  <div
                    className={
                      "min-h-7 text-[11.5px] font-medium leading-tight " +
                      (km ? "text-positive" : race ? "text-brand" : "text-text-muted")
                    }
                  >
                    {km ? `✓ ${km.toFixed(1)} km` : race ? "Race" : isPast ? "Rest" : ""}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <NextRaceCard />
          </div>
        </>
      )}
    </div>
  );
}
