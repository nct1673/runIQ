"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";
import {
  ArrowUpRightIcon,
  BoltIcon,
  ChevronDownIcon,
  ClockIcon,
  CloudIcon,
  HeartIcon,
  RainIcon,
  SunIcon,
  TrendingUpIcon,
} from "@/components/icons";

/** Blueprint §8: list of imported activities, backed by GET /api/activities. */

interface Activity {
  id: string;
  started_at: string;
  distance_km: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  avg_cadence: number | null;
  elevation_gain_m: number | null;
  activity_type: string | null;
  temperature_c: number | null;
  weather_condition: string | null;
}

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  running: "Outdoor Run",
  treadmill_running: "Treadmill Run",
};

function formatPace(secPerKm: number | null): string {
  if (secPerKm == null) return "--";
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}/km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): { weekday: string; day: string; time: string } {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Sun/Clouds/Rain (etc.) -> a matching glyph. Falls back to Cloud for
 * anything not explicitly mapped, since OpenWeather's `main` categories
 * are numerous (Drizzle, Thunderstorm, Snow, Mist, ...) but the point
 * here is a quick visual read, not a precise icon per condition. */
function WeatherGlyph({ condition, className }: { condition: string; className?: string }) {
  const key = condition.toLowerCase();
  if (key === "clear") return <SunIcon className={className} />;
  if (key === "rain" || key === "drizzle" || key === "thunderstorm") return <RainIcon className={className} />;
  return <CloudIcon className={className} />;
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof TrendingUpIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-sm font-semibold text-text">{value}</span>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const { weekday, day, time } = formatDate(activity.started_at);
  const isTreadmill = activity.activity_type === "treadmill_running";
  const typeLabel = activity.activity_type ? ACTIVITY_TYPE_LABEL[activity.activity_type] ?? activity.activity_type : "Run";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " +
              (isTreadmill ? "bg-stat-time" : "bg-stat-runs")
            }
          >
            {isTreadmill ? (
              <ClockIcon className="h-5 w-5 text-white" />
            ) : (
              <BoltIcon className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-text">
              {weekday}, {day} <span className="text-text-muted">· {time}</span>
            </div>
            <div className="text-xs text-text-muted">{typeLabel}</div>
          </div>
        </div>

        {activity.temperature_c != null && (
          <div className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
            <WeatherGlyph condition={activity.weather_condition ?? ""} className="h-3.5 w-3.5" />
            {Math.round(activity.temperature_c)}°C
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 sm:grid-cols-5">
        <StatTile icon={TrendingUpIcon} value={`${activity.distance_km.toFixed(2)} km`} label="Distance" />
        <StatTile icon={ClockIcon} value={formatDuration(activity.duration_s)} label="Duration" />
        <StatTile icon={BoltIcon} value={formatPace(activity.avg_pace_s_per_km)} label="Pace" />
        <StatTile icon={HeartIcon} value={activity.avg_hr != null ? `${Math.round(activity.avg_hr)} bpm` : "--"} label="Avg HR" />
        <StatTile
          icon={ArrowUpRightIcon}
          value={activity.elevation_gain_m != null ? `${Math.round(activity.elevation_gain_m)} m` : "--"}
          label="Elevation"
        />
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/activities")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setActivities)
      .catch((err) => setError(err.message));
  }, []);

  const groups = useMemo(() => {
    if (!activities) return [];
    const byMonth = new Map<string, Activity[]>();
    for (const a of activities) {
      const key = monthKey(a.started_at);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(a);
    }
    return Array.from(byMonth.values()).map((group) => {
      const totalKm = group.reduce((sum, a) => sum + a.distance_km, 0);
      const totalDurationS = group.reduce((sum, a) => sum + a.duration_s, 0);
      return {
        label: monthLabel(group[0].started_at),
        totalKm,
        totalDurationS,
        // Weighted by distance (total time / total distance), not an
        // average of each run's own pace -- matches how "pace" is
        // computed everywhere else in the app (duration / distance).
        avgPaceSPerKm: totalKm > 0 ? totalDurationS / totalKm : null,
        activities: group,
      };
    });
  }, [activities]);

  // Default-open the most recent month only, once, on first load --
  // afterward this ref stops the effect from re-opening a month the
  // user deliberately closed.
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const didDefaultOpen = useRef(false);
  useEffect(() => {
    if (groups.length > 0 && !didDefaultOpen.current) {
      didDefaultOpen.current = true;
      setOpenMonths(new Set([groups[0].label]));
    }
  }, [groups]);

  function toggleMonth(label: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div>
      <Header title="Activities" subtitle="Imported, processed runs." />

      {error && <p className="text-sm text-negative">Failed to load activities: {error}</p>}
      {!error && !activities && <p className="text-sm text-text-muted">Loading...</p>}
      {activities && activities.length === 0 && (
        <EmptyPlaceholder label="No processed activities yet -- press Update Data on the dashboard." />
      )}

      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const isOpen = openMonths.has(group.label);
          return (
            <div key={group.label} className="rounded-2xl border border-border bg-surface">
              <button
                type="button"
                onClick={() => toggleMonth(group.label)}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ChevronDownIcon
                    className={"h-4 w-4 text-text-muted transition-transform " + (isOpen ? "" : "-rotate-90")}
                  />
                  <h2 className="text-sm font-semibold text-text">{group.label}</h2>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>
                    {group.activities.length} run{group.activities.length === 1 ? "" : "s"}
                  </span>
                  <span>{group.totalKm.toFixed(1)} km</span>
                  <span>{formatDuration(group.totalDurationS)}</span>
                  <span>avg {formatPace(group.avgPaceSPerKm)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 px-5 pb-5">
                  {group.activities.map((a) => (
                    <ActivityCard key={a.id} activity={a} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
