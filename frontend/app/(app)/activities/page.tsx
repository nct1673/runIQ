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
  hr_time_in_zone_1: number | null;
  hr_time_in_zone_2: number | null;
  hr_time_in_zone_3: number | null;
  hr_time_in_zone_4: number | null;
  hr_time_in_zone_5: number | null;
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

const ZONE_STRIP_BG: Record<number, string> = {
  1: "#6e6a9e",
  2: "var(--color-blue)",
  3: "var(--color-positive)",
  4: "linear-gradient(90deg, #ffb938, #ff7a45)",
  5: "var(--color-brand)",
};

function Metric({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="sm:pl-[18px]">
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {children}
    </div>
  );
}

const COMPARE_RUNS = 5;

/** Average pace of the up-to-5 runs of the same type just before `activity`
 * (`all` is newest first), i.e. your own baseline, as in the dashboard's Latest run card. */
function paceDiffVsPrevious(activity: Activity, all: Activity[]): { diff: number; n: number } | null {
  if (activity.avg_pace_s_per_km == null) return null;
  const earlier = all
    .filter(
      (a) =>
        a.id !== activity.id &&
        a.started_at < activity.started_at &&
        a.activity_type === activity.activity_type &&
        a.avg_pace_s_per_km != null,
    )
    .slice(0, COMPARE_RUNS);
  if (earlier.length === 0) return null;
  const baseline = earlier.reduce((sum, a) => sum + (a.avg_pace_s_per_km as number), 0) / earlier.length;
  return { diff: activity.avg_pace_s_per_km - baseline, n: earlier.length };
}

function activityHrZones(a: Activity): ZoneDatum[] {
  return [
    { zone: 1, seconds: a.hr_time_in_zone_1 ?? 0 },
    { zone: 2, seconds: a.hr_time_in_zone_2 ?? 0 },
    { zone: 3, seconds: a.hr_time_in_zone_3 ?? 0 },
    { zone: 4, seconds: a.hr_time_in_zone_4 ?? 0 },
    { zone: 5, seconds: a.hr_time_in_zone_5 ?? 0 },
  ];
}

/** Single-row stacked bar of time-in-HR-zone, with percentages beneath. */
function ZoneStrip({ zones }: { zones: ZoneDatum[] }) {
  const total = zones.reduce((sum, z) => sum + z.seconds, 0);
  if (total === 0) return null;
  const pcts = zones.map((z) => ({ zone: z.zone, pct: (z.seconds / total) * 100 }));
  const top = pcts.reduce((best, z) => (z.pct > best.pct ? z : best));

  return (
    <div className="mt-[18px]">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {pcts.map(({ zone, pct }) => (
          <i key={zone} style={{ width: `${pct}%`, background: ZONE_STRIP_BG[zone] }} />
        ))}
      </div>
      <div className="mt-[7px] flex justify-between text-[11px] text-text-muted">
        <span>Time in HR zones</span>
        <span>
          {pcts.map(({ zone, pct }, i) => (
            <span key={zone}>
              {i > 0 && " · "}
              {zone === top.zone ? (
                <b className="font-medium text-blue">
                  Z{zone} {Math.round(pct)}%
                </b>
              ) : (
                `Z${zone} ${Math.round(pct)}%`
              )}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function dominantZone(zones: ZoneDatum[]): number | null {
  const total = zones.reduce((sum, z) => sum + z.seconds, 0);
  if (total === 0) return null;
  return zones.reduce((best, z) => (z.seconds > best.seconds ? z : best)).zone;
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

/** The click-to-expand dropdown's contents: the full DB record as a
 * label/value grid, then the zone charts (the one part asked for as a
 * chart, not a plain field) below it. */
function ActivityDetailPanel({ state }: { state: "loading" | "error" | ActivityDetail }) {
  if (state === "loading") {
    return <p className="px-5 pb-5 text-sm text-text-muted">Loading details...</p>;
  }
  if (state === "error") {
    return <p className="px-5 pb-5 text-sm text-negative">Failed to load activity details.</p>;
  }

  return (
    <div className="flex flex-col gap-5 border-t border-border px-5 pb-5 pt-4">
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ZoneBars title="Heart Rate Zones" zones={hrZones(state)} />
        <ZoneBars title="Power Zones" zones={powerZones(state)} />
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  allActivities,
  isOpen,
  detail,
  onToggle,
}: {
  activity: Activity;
  allActivities: Activity[];
  isOpen: boolean;
  detail: "loading" | "error" | ActivityDetail | undefined;
  onToggle: () => void;
}) {
  const { weekday, day, time } = formatDate(activity.started_at);
  const typeLabel = activity.activity_type ? ACTIVITY_TYPE_LABEL[activity.activity_type] ?? activity.activity_type : "Run";
  const zones = activityHrZones(activity);
  const topZone = dominantZone(zones);
  const pace = paceDiffVsPrevious(activity, allActivities);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full rounded-2xl p-[22px] text-left hover:bg-surface-hover"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <i className="inline-block h-2 w-2 rounded-full bg-brand" />
            {weekday} {day}
            <span className="font-normal text-text-muted">
              · {time} · {typeLabel}
            </span>
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

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="text-5xl font-semibold tracking-tight tabular-nums">
            {activity.distance_km.toFixed(2)}
            <span className="ml-1 text-[15px] font-medium text-text-muted">km</span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-y-4 sm:grid-cols-4 sm:border-l sm:border-border">
            <Metric label="Pace" value={formatPace(activity.avg_pace_s_per_km)}>
              {pace == null ? null : Math.abs(pace.diff) < 2 ? (
                <span className="text-xs text-text-muted">In line with last {pace.n}</span>
              ) : (
                <span className={"text-xs " + (pace.diff < 0 ? "text-positive" : "text-negative")}>
                  {pace.diff < 0 ? "↑" : "↓"} {Math.round(Math.abs(pace.diff))}s vs last {pace.n}
                </span>
              )}
            </Metric>
            <Metric label="Time" value={formatDuration(activity.duration_s)}>
              <span className="text-xs text-text-muted">moving</span>
            </Metric>
            <Metric label="Avg HR" value={activity.avg_hr != null ? `${Math.round(activity.avg_hr)} bpm` : "--"}>
              {topZone != null && <span className="text-xs text-text-muted">Zone {topZone}</span>}
            </Metric>
            <Metric label="Cadence" value={activity.avg_cadence != null ? `${Math.round(activity.avg_cadence)} spm` : "--"}>
              {activity.avg_cadence != null && activity.avg_cadence < 170 && (
                <span className="text-xs text-amber">Aim 170+</span>
              )}
            </Metric>
          </div>
        </div>

        <ZoneStrip zones={zones} />
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
                      allActivities={activities ?? []}
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
