"use client";

import { useEffect, useState } from "react";

import { EmptyPlaceholder } from "@/components/Card";
import { FlagIcon } from "@/components/icons";
import { formatDuration, formatPace } from "@/lib/format";

interface Race {
  id: string;
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
  race_time: string | null; // "HH:MM:SS", local flag-off time
  location: string | null;
  status: "upcoming" | "completed";
  goal_time_s: number | null;
}

const KNOWN_DISTANCES: [number, string][] = [
  [5, "5K"],
  [10, "10K"],
  [21.0975, "Half Marathon"],
  [42.195, "Marathon"],
];

/** Common race distances get a nicer label than "21.1 km". */
function distanceLabel(km: number): string {
  const match = KNOWN_DISTANCES.find(([d]) => Math.abs(d - km) < 0.05);
  return match ? match[1] : `${km.toFixed(1)} km`;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

/** Live countdown to `raceDate` ("YYYY-MM-DD") at `raceTime` ("HH:MM:SS")
 * local time -- falls back to midnight when no flag-off time is set. */
function useCountdown(raceDate: string | undefined, raceTime: string | null | undefined): TimeLeft | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!raceDate) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [raceDate]);

  if (!raceDate) return null;

  const target = new Date(`${raceDate}T${raceTime || "00:00:00"}`).getTime();
  const diff = target - now;
  const isPast = diff <= 0;
  const clamped = Math.max(0, diff);

  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor(clamped / 3_600_000) % 24,
    minutes: Math.floor(clamped / 60_000) % 60,
    seconds: Math.floor(clamped / 1_000) % 60,
    isPast,
  };
}

function Mini({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-bg/35 px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-wider text-text-soft">{label}</div>
      <div className="mb-0.5 mt-1.5 text-lg font-semibold">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span>}
      </div>
      {note && <div className="text-xs text-text-muted">{note}</div>}
    </div>
  );
}

/** Hero card: the next upcoming race, with a live countdown. `longestRunKm`
 * and `peakMonthKm` (both optional) are shown as supporting context so the
 * hero answers "am I ready?" rather than just "how long?". */
export default function NextRaceCard({
  longestRunKm,
  peakMonthKm,
}: {
  longestRunKm?: number | null;
  peakMonthKm?: number | null;
}) {
  const [races, setRaces] = useState<Race[] | null>(null);

  useEffect(() => {
    fetch("/api/races")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRaces)
      .catch(() => setRaces(null));
  }, []);

  const next = races
    ?.filter((r) => r.status === "upcoming")
    .sort((a, b) => a.race_date.localeCompare(b.race_date))[0];

  const countdown = useCountdown(next?.race_date, next?.race_time);
  const targetPace = next && next.goal_time_s != null ? next.goal_time_s / next.distance_km : null;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-violet/30 bg-[radial-gradient(560px_300px_at_100%_0%,rgba(255,77,141,0.2),transparent_65%),radial-gradient(560px_300px_at_0%_0%,rgba(122,92,255,0.24),transparent_65%),#17143a] p-7 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          <FlagIcon className="h-3 w-3" />
          Next race
        </span>
        <a href="/race" className="text-xs text-text-soft hover:text-text">
          Race plan &rarr;
        </a>
      </div>

      {!races ? (
        <div className="mt-6">
          <EmptyPlaceholder label="Loading..." />
        </div>
      ) : !next ? (
        <div className="mt-6">
          <EmptyPlaceholder label="No upcoming races -- add one on the Race page." />
        </div>
      ) : (
        <>
          <div className="mb-1.5 mt-3.5 truncate text-[28px] font-semibold tracking-tight">{next.name}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-text-soft">
            <span>
              {distanceLabel(next.distance_km)}
              {KNOWN_DISTANCES.every(([d]) => Math.abs(d - next.distance_km) >= 0.05) ? "" : ` · ${next.distance_km.toFixed(1)} km`}
            </span>
            {next.location && <span>{next.location}</span>}
            <span>
              {new Date(next.race_date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              {next.race_time
                ? ` · ${new Date(`2000-01-01T${next.race_time}`).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : ""}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            {countdown && !countdown.isPast ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[72px] font-semibold leading-[0.9] tracking-tighter text-white sm:text-[88px]">
                  {countdown.days}
                </span>
                <span className="text-base text-text-soft">{countdown.days === 1 ? "day" : "days"}</span>
                <span className="ml-2.5 text-[13px] text-text-muted">
                  {countdown.hours}h {String(countdown.minutes).padStart(2, "0")}m to gun time
                </span>
              </div>
            ) : (
              <div className="rounded-xl bg-brand-soft px-4 py-3 text-lg font-semibold text-brand">Race day is here</div>
            )}

            {next.goal_time_s != null && (
              <div className="flex gap-7 text-right">
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">Goal time</div>
                  <div className="text-2xl font-semibold">{formatDuration(next.goal_time_s)}</div>
                </div>
                {targetPace != null && (
                  <div>
                    <div className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">Target pace</div>
                    <div className="text-2xl font-semibold">{formatPace(targetPace)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(longestRunKm != null || peakMonthKm != null) && (
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {longestRunKm != null && (
                <Mini
                  label="Longest run"
                  value={longestRunKm.toFixed(1)}
                  unit="km"
                  note={`${Math.round((longestRunKm / next.distance_km) * 100)}% of race distance`}
                />
              )}
              {peakMonthKm != null && <Mini label="Peak month" value={peakMonthKm.toFixed(0)} unit="km" note="Last 12 months" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
