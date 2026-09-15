"use client";

import { useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first offset (0 = month starts on Monday). */
function firstWeekdayOffset(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

/**
 * Self-contained month-view calendar. Navigation is real (client-side
 * month stepping); there's no event/schedule data wired up yet -- this
 * is UI-framework scaffolding, not the Goals/schedule feature itself.
 */
export default function MiniCalendar() {
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

      <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-text-muted">
            {d}
          </div>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <div key={day} className="flex items-center justify-center py-0.5">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full " +
                  (isToday(day) ? "bg-brand text-white" : "text-text")
                }
              >
                {day}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
