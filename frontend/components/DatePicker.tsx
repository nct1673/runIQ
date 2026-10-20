"use client";

import { useEffect, useRef, useState } from "react";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDisplay(s: string, weekday = false): string {
  const d = parseISODate(s);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    ...(weekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  variant = "default",
}: {
  id?: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  /** "drawer": taller field, icon on the left, weekday in the text (race drawer). */
  variant?: "default" | "drawer";
}) {
  const drawer = variant === "drawer";
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setViewDate(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISODate(today);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    onChange(toISODate(new Date(year, month, day)));
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className={
          drawer
            ? "flex h-11 w-full items-center gap-2.5 rounded-[11px] border border-border-strong bg-bg px-3.5 text-left text-sm text-text outline-none focus:border-violet focus:shadow-[0_0_0_3px_rgba(162,123,255,0.2)]"
            : "flex w-full items-center justify-between rounded-xl border border-border bg-bg px-3 py-2 text-left text-sm text-text outline-none focus:border-brand"
        }
      >
        {drawer && <CalendarIcon className="h-4 w-4 shrink-0 text-text-muted" />}
        <span className={value ? "text-text" : "text-text-muted"}>
          {value ? formatDisplay(value, drawer) : placeholder}
        </span>
        {!drawer && <CalendarIcon className="h-4 w-4 shrink-0 text-text-muted" />}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="text-sm font-medium text-text">
              {viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-text-muted">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {cells.map((day, i) => {
              if (day == null) return <div key={i} />;
              const iso = toISODate(new Date(year, month, day));
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(day)}
                  className={
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors " +
                    (isSelected
                      ? "bg-brand text-white"
                      : isToday
                        ? "border border-brand text-text"
                        : "text-text hover:bg-surface-hover")
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(todayIso);
                setOpen(false);
              }}
              className="text-xs font-medium text-brand hover:opacity-80"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-medium text-text-muted hover:text-text"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
