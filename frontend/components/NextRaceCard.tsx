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

/** Hero card: the next upcoming race, with a live countdown. */
export default function NextRaceCard() {
  const [races, setRaces] = useState<Race[] | null>(null);

  useEffect(() => {
    fetch("/api/races")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRaces)
      .catch(() => setRaces(null));
  }, []);

  const next = races?.filter((r) => r.status === "upcoming").sort((a, b) => a.race_date.localeCompare(b.race_date))[0];

  const countdown = useCountdown(next?.race_date, next?.race_time);
  const targetPace = next && next.goal_time_s != null ? next.goal_time_s / next.distance_km : null;

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-violet/30 px-6 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
      style={{
        background:
          "radial-gradient(560px 300px at 100% 0%, rgba(255,77,141,0.2), transparent 65%), radial-gradient(560px 300px at 0% 0%, rgba(122,92,255,0.24), transparent 65%), #17143a",
      }}
    >
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
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <div className="mb-1 truncate text-2xl font-semibold tracking-tight">{next.name}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-text-soft">
                <span>
                  {distanceLabel(next.distance_km)}
                  {KNOWN_DISTANCES.every(([d]) => Math.abs(d - next.distance_km) >= 0.05)
                    ? ""
                    : ` · ${next.distance_km.toFixed(1)} km`}
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
            </div>

            {countdown && !countdown.isPast ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[52px] font-semibold leading-none tracking-tighter text-white">
                  {countdown.days}
                </span>
                <span className="text-base text-text-soft">{countdown.days === 1 ? "day" : "days"}</span>
                <span className="ml-2.5 text-[13px] text-text-muted">
                  {countdown.hours}h {String(countdown.minutes).padStart(2, "0")}m to gun time
                </span>
              </div>
            ) : (
              <div className="rounded-xl bg-brand-soft px-4 py-3 text-lg font-semibold text-brand">
                Race day is here
              </div>
            )}
          </div>

          {next.goal_time_s != null && (
            <div className="mt-3 flex gap-7">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">Goal time</div>
                <div className="text-xl font-semibold">{formatDuration(next.goal_time_s)}</div>
              </div>
              {targetPace != null && (
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">Target pace</div>
                  <div className="text-xl font-semibold">{formatPace(targetPace)}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One compact race tile: badge, name + details on the left, countdown on the right. */
function RaceTile({ race, rank }: { race: Race; rank: number }) {
  const countdown = useCountdown(race.race_date, race.race_time);
  const first = rank === 0;
  const targetPace = race.goal_time_s != null ? race.goal_time_s / race.distance_km : null;
  const when = new Date(race.race_date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className={
        "relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl border px-5 py-2.5 " +
        (first ? "border-violet/30" : "border-border-strong")
      }
      style={{
        background: first
          ? "radial-gradient(420px 220px at 100% 0%, rgba(255,77,141,0.2), transparent 65%), radial-gradient(420px 220px at 0% 0%, rgba(122,92,255,0.24), transparent 65%), #17143a"
          : "radial-gradient(420px 220px at 100% 0%, rgba(56,214,255,0.1), transparent 65%), radial-gradient(420px 220px at 0% 0%, rgba(122,92,255,0.12), transparent 65%), #14132e",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider " +
            (first ? "border-white/25 bg-white/15 text-white" : "border-white/15 bg-white/5 text-text-soft")
          }
        >
          <FlagIcon className="h-3 w-3" />
          {first ? "Next race" : "Then"}
        </span>
        <a href="/race" className="text-xs text-text-soft hover:text-text">
          {distanceLabel(race.distance_km)}
          {KNOWN_DISTANCES.some(([d]) => Math.abs(d - race.distance_km) < 0.05)
            ? ` · ${race.distance_km.toFixed(1)} km`
            : ""}{" "}
          &rarr;
        </a>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className={"truncate font-semibold tracking-tight " + (first ? "text-xl" : "text-lg")}>{race.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-text-soft">
            <span>
              {when}
              {race.race_time
                ? ` · ${new Date(`2000-01-01T${race.race_time}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                : ""}
            </span>
            {race.location && <span>{race.location}</span>}
            {race.goal_time_s != null && (
              <span>
                Goal {formatDuration(race.goal_time_s)}
                {targetPace != null ? ` · ${formatPace(targetPace)}` : ""}
              </span>
            )}
          </div>
        </div>
        {countdown && !countdown.isPast ? (
          <div className="flex shrink-0 items-baseline gap-1">
            <span
              className={
                "font-semibold leading-none tracking-tighter text-white " + (first ? "text-[38px]" : "text-[32px]")
              }
            >
              {countdown.days}
            </span>
            <span className="text-sm text-text-soft">{countdown.days === 1 ? "day" : "days"}</span>
          </div>
        ) : (
          <span className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand">
            Race day
          </span>
        )}
      </div>
    </div>
  );
}

/** The next two upcoming races as stacked compact tiles; they share whatever
 * height the parent gives them, so the host card keeps its size. */
export function UpcomingRaces() {
  const [races, setRaces] = useState<Race[] | null>(null);

  useEffect(() => {
    fetch("/api/races")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRaces)
      .catch(() => setRaces(null));
  }, []);

  const upcoming = (races ?? [])
    .filter((r) => r.status === "upcoming")
    .sort((a, b) => a.race_date.localeCompare(b.race_date))
    .slice(0, 2);

  if (!races) return <EmptyPlaceholder label="Loading..." />;
  if (upcoming.length === 0) return <EmptyPlaceholder label="No upcoming races -- add one on the Race page." />;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {upcoming.map((r, i) => (
        <RaceTile key={r.id} race={r} rank={i} />
      ))}
    </div>
  );
}
