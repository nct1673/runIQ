"use client";

import { useMemo, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon, RunnerIcon } from "@/components/icons";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export interface RunDay {
  count: number;
  distance_km: number;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first offset (0 = month starts on Monday). */
function firstWeekdayOffset(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Month-view calendar. `runsByDate` (keyed "YYYY-MM-DD", from
 * GET /api/activities) marks days that had a run with a running icon +
 * that day's distance, and rolls up into the month summary line below
 * the grid -- real activity history, standing in for the future
 * scheduled-workouts feature (Goals module, not built yet) until that
 * exists.
 */
export default function MiniCalendar({ runsByDate = new Map<string, RunDay>() }: { runsByDate?: Map<string, RunDay> }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function step(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  const total = daysInMonth(year, month);
  const offset = firstWeekdayOffset(year, month);
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const monthSummary = useMemo(() => {
    let runs = 0;
    let distanceKm = 0;
    for (let day = 1; day <= total; day++) {
      const entry = runsByDate.get(dateKey(year, month, day));
      if (entry) {
        runs += entry.count;
        distanceKm += entry.distance_km;
      }
    }
    return { runs, distanceKm };
  }, [runsByDate, year, month, total]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-text">{monthLabel}</span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-text-muted">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const entry = runsByDate.get(dateKey(year, month, day));
          return (
            <div
              key={day}
              className="flex flex-col items-center gap-0.5 py-0.5"
              title={entry ? `${entry.distance_km.toFixed(1)} km · ${entry.count} run${entry.count === 1 ? "" : "s"}` : undefined}
            >
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full " +
                  (isToday(day) ? "bg-brand text-white" : "text-text")
                }
              >
                {day}
              </span>
              <div className="flex h-3.5 items-center justify-center gap-0.5 text-stat-distance">
                {entry && (
                  <>
                    <RunnerIcon className="h-2.5 w-2.5 shrink-0" />
                    <span className="text-[9px] font-medium leading-none">{entry.distance_km.toFixed(1)}k</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="text-text-muted">This month</span>
        {monthSummary.runs > 0 ? (
          <span className="font-medium text-text">
            {monthSummary.runs} run{monthSummary.runs === 1 ? "" : "s"} · {monthSummary.distanceKm.toFixed(0)} km
          </span>
        ) : (
          <span className="text-text-muted">No runs</span>
        )}
      </div>
    </div>
  );
}
