"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyPlaceholder } from "@/components/Card";
import ZoneBars, { ZoneDatum } from "@/components/charts/ZoneBars";
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
import { formatDuration, formatPace } from "@/lib/format";

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

/** GET /api/activities/{id} -- every `activities` column plus weather,
 * for the click-to-expand detail dropdown (see app.schemas.activity.ActivityDetailOut). */
interface ActivityDetail {
  id: string;
  source: string;
  external_id: string | null;
  started_at: string;
  distance_km: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  avg_cadence: number | null;
  elevation_gain_m: number | null;
  activity_type: string | null;
  created_at: string;
  raw_imported_at: string | null;
  activity_name: string | null;
  event_type: string | null;
  elapsed_duration_s: number | null;
  moving_duration_s: number | null;
  calories: number | null;
  avg_power: number | null;
  norm_power: number | null;
  avg_stride_length: number | null;
  avg_vertical_oscillation: number | null;
  avg_vertical_ratio: number | null;
  avg_ground_contact_time: number | null;
  start_latitude: number | null;
  start_longitude: number | null;
  training_effect_label: string | null;
  vo2_max: number | null;
  hr_time_in_zone_1: number | null;
  hr_time_in_zone_2: number | null;
  hr_time_in_zone_3: number | null;
  hr_time_in_zone_4: number | null;
  hr_time_in_zone_5: number | null;
  power_time_in_zone_1: number | null;
  power_time_in_zone_2: number | null;
  power_time_in_zone_3: number | null;
  power_time_in_zone_4: number | null;
  power_time_in_zone_5: number | null;
  location: string | null;
  pace: string | null;
  temperature_c: number | null;
  feels_like_c: number | null;
  humidity_pct: number | null;
  wind_speed_kmh: number | null;
  precipitation_mm: number | null;
  weather_condition: string | null;
}

function fmt(value: string | number | null | undefined, decimals = 1): string {
  if (value == null) return "--";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
  return value;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Every non-zone field on ActivityDetail, in display order -- the zone
 * columns are pulled out separately for ZoneBars instead of listed here. */
const DETAIL_FIELDS: { label: string; value: (d: ActivityDetail) => string }[] = [
  { label: "Activity Name", value: (d) => fmt(d.activity_name) },
  { label: "Type", value: (d) => fmt(d.activity_type) },
  { label: "Event Type", value: (d) => fmt(d.event_type) },
  { label: "Location", value: (d) => fmt(d.location) },
  { label: "Started At", value: (d) => fmtDate(d.started_at) },
  { label: "Distance (km)", value: (d) => fmt(d.distance_km, 2) },
  { label: "Duration", value: (d) => formatDuration(d.duration_s) },
  { label: "Elapsed Duration", value: (d) => (d.elapsed_duration_s != null ? formatDuration(d.elapsed_duration_s) : "--") },
  { label: "Moving Duration", value: (d) => (d.moving_duration_s != null ? formatDuration(d.moving_duration_s) : "--") },
  { label: "Pace", value: (d) => fmt(d.pace) },
  { label: "Avg Pace", value: (d) => formatPace(d.avg_pace_s_per_km) },
  { label: "Avg HR (bpm)", value: (d) => fmt(d.avg_hr, 0) },
  { label: "Avg Cadence (spm)", value: (d) => fmt(d.avg_cadence, 0) },
  { label: "Elevation Gain (m)", value: (d) => fmt(d.elevation_gain_m, 0) },
  { label: "Calories", value: (d) => fmt(d.calories, 0) },
  { label: "Avg Power (W)", value: (d) => fmt(d.avg_power, 0) },
  { label: "Norm Power (W)", value: (d) => fmt(d.norm_power, 0) },
  { label: "Avg Stride Length (cm)", value: (d) => fmt(d.avg_stride_length) },
  { label: "Avg Vertical Oscillation (cm)", value: (d) => fmt(d.avg_vertical_oscillation) },
  { label: "Avg Vertical Ratio (%)", value: (d) => fmt(d.avg_vertical_ratio) },
  { label: "Avg Ground Contact Time (ms)", value: (d) => fmt(d.avg_ground_contact_time, 0) },
  { label: "VO2 Max", value: (d) => fmt(d.vo2_max, 0) },
  { label: "Training Effect", value: (d) => fmt(d.training_effect_label) },
  { label: "Start Latitude", value: (d) => fmt(d.start_latitude, 4) },
  { label: "Start Longitude", value: (d) => fmt(d.start_longitude, 4) },
  { label: "Temperature (°C)", value: (d) => fmt(d.temperature_c) },
  { label: "Feels Like (°C)", value: (d) => fmt(d.feels_like_c) },
  { label: "Humidity (%)", value: (d) => fmt(d.humidity_pct, 0) },
  { label: "Wind Speed (km/h)", value: (d) => fmt(d.wind_speed_kmh) },
  { label: "Precipitation (mm)", value: (d) => fmt(d.precipitation_mm) },
  { label: "Weather Condition", value: (d) => fmt(d.weather_condition) },
  { label: "Source", value: (d) => fmt(d.source) },
  { label: "External ID", value: (d) => fmt(d.external_id) },
  { label: "Raw Imported At", value: (d) => fmtDate(d.raw_imported_at) },
  { label: "Created At", value: (d) => fmtDate(d.created_at) },
  { label: "ID", value: (d) => d.id },
];

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  running: "Outdoor Run",
  treadmill_running: "Treadmill Run",
};

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

function hrZones(d: ActivityDetail): ZoneDatum[] {
  return [
    { zone: 1, seconds: d.hr_time_in_zone_1 ?? 0 },
    { zone: 2, seconds: d.hr_time_in_zone_2 ?? 0 },
    { zone: 3, seconds: d.hr_time_in_zone_3 ?? 0 },
    { zone: 4, seconds: d.hr_time_in_zone_4 ?? 0 },
    { zone: 5, seconds: d.hr_time_in_zone_5 ?? 0 },
  ];
}

function powerZones(d: ActivityDetail): ZoneDatum[] {
  return [
    { zone: 1, seconds: d.power_time_in_zone_1 ?? 0 },
    { zone: 2, seconds: d.power_time_in_zone_2 ?? 0 },
    { zone: 3, seconds: d.power_time_in_zone_3 ?? 0 },
    { zone: 4, seconds: d.power_time_in_zone_4 ?? 0 },
    { zone: 5, seconds: d.power_time_in_zone_5 ?? 0 },
  ];
}

/** The click-to-expand dropdown's contents: zone charts up top (the one
 * part asked for as a chart, not a plain field), the full DB record
 * below as a label/value grid. */
function ActivityDetailPanel({ state }: { state: "loading" | "error" | ActivityDetail }) {
  if (state === "loading") {
    return <p className="px-5 pb-5 text-sm text-text-muted">Loading details...</p>;
  }
  if (state === "error") {
    return <p className="px-5 pb-5 text-sm text-negative">Failed to load activity details.</p>;
  }

  return (
    <div className="flex flex-col gap-5 border-t border-border px-5 pb-5 pt-4">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ZoneBars title="Heart Rate Zones" zones={hrZones(state)} />
        <ZoneBars title="Power Zones" zones={powerZones(state)} />
      </div>

      <div>
        <h4 className="mb-3 text-sm font-medium text-text">Full Record</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {DETAIL_FIELDS.map(({ label, value }) => (
            <div key={label}>
              <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
              <div className="truncate text-sm text-text" title={value(state)}>
                {value(state)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  isOpen,
  detail,
  onToggle,
}: {
  activity: Activity;
  isOpen: boolean;
  detail: "loading" | "error" | ActivityDetail | undefined;
  onToggle: () => void;
}) {
  const { weekday, day, time } = formatDate(activity.started_at);
  const isTreadmill = activity.activity_type === "treadmill_running";
  const typeLabel = activity.activity_type ? ACTIVITY_TYPE_LABEL[activity.activity_type] ?? activity.activity_type : "Run";

  return (
    <div className="rounded-2xl border border-border bg-surface transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full p-5 text-left hover:bg-surface-hover"
      >
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

          <div className="flex items-center gap-2.5">
            {activity.temperature_c != null && (
              <div className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
                <WeatherGlyph condition={activity.weather_condition ?? ""} className="h-3.5 w-3.5" />
                {Math.round(activity.temperature_c)}°C
              </div>
            )}
            <ChevronDownIcon
              className={"h-4 w-4 shrink-0 text-text-muted transition-transform " + (isOpen ? "" : "-rotate-90")}
            />
          </div>
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
      </button>

      {isOpen && detail && <ActivityDetailPanel state={detail} />}
    </div>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openActivityId, setOpenActivityId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, "loading" | "error" | ActivityDetail>>({});

  function toggleActivity(id: string) {
    setOpenActivityId((prev) => (prev === id ? null : id));
    if (!(id in details)) {
      setDetails((prev) => ({ ...prev, [id]: "loading" }));
      fetch(`/api/activities/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((detail: ActivityDetail) => setDetails((prev) => ({ ...prev, [id]: detail })))
        .catch(() => setDetails((prev) => ({ ...prev, [id]: "error" })));
    }
  }

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
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      isOpen={openActivityId === a.id}
                      detail={details[a.id]}
                      onToggle={() => toggleActivity(a.id)}
                    />
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
