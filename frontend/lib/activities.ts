/** Types and pure helpers for the /activities page (list + detail panel).
 * Everything here is derived from GET /api/activities, GET
 * /api/activities/{id} and GET /api/races -- no numbers are invented. */
import { formatDuration } from "@/lib/format";

/** GET /api/activities row (app.schemas.activity.ActivityOut). */
export interface Activity {
  id: string;
  started_at: string; // naive local ISO, e.g. "2026-10-12T18:47:00"
  distance_km: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  avg_cadence: number | null;
  elevation_gain_m: number | null;
  activity_type: string | null;
  vo2_max: number | null;
  temperature_c: number | null;
  weather_condition: string | null;
  hr_time_in_zone_1: number | null;
  hr_time_in_zone_2: number | null;
  hr_time_in_zone_3: number | null;
  hr_time_in_zone_4: number | null;
  hr_time_in_zone_5: number | null;
  activity_name: string | null;
  location: string | null;
  training_effect_label: string | null;
  moving_duration_s: number | null;
  avg_stride_length: number | null;
  avg_vertical_oscillation: number | null;
  avg_vertical_ratio: number | null;
  avg_ground_contact_time: number | null;
  record_labels: string[];
}

/** GET /api/activities/{id} -- every `activities` column plus weather. */
export interface ActivityDetail {
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

export type DetailState = ActivityDetail | "loading" | "error" | undefined;

/** GET /api/races (only the fields used here). */
export interface Race {
  id: string;
  name: string;
  race_date: string; // "YYYY-MM-DD"
  status: string;
}

/* ------------------------------------------------------------------ */
/* Filters & sorting                                                   */
/* ------------------------------------------------------------------ */

export const LONG_RUN_KM = 15;

export type FilterKey = "all" | "outdoor" | "treadmill" | "long" | "records";
export type SortKey = "newest" | "oldest" | "longest" | "fastest";

export const FILTERS: { key: FilterKey; label: string; showCount: boolean }[] = [
  { key: "all", label: "All", showCount: true },
  { key: "outdoor", label: "Outdoor", showCount: true },
  { key: "treadmill", label: "Treadmill", showCount: true },
  { key: "long", label: `Long runs`, showCount: false },
  { key: "records", label: "Races & PRs", showCount: false },
];

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "longest", label: "Longest" },
  { key: "fastest", label: "Fastest pace" },
];

export function isTreadmill(a: { activity_type: string | null }): boolean {
  return a.activity_type === "treadmill_running";
}

export function typeLabel(a: { activity_type: string | null }): string {
  return isTreadmill(a) ? "Treadmill" : "Outdoor";
}

export function runTitle(a: Pick<Activity, "activity_name" | "activity_type">): string {
  return a.activity_name || (isTreadmill(a) ? "Treadmill Run" : "Run");
}

/** "YYYY-MM-DD" of a naive local ISO timestamp. */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** For each completed race, the longest run on its date (the race itself,
 * not a warm-up jog). */
export function raceRunIds(activities: Activity[], races: Race[]): Set<string> {
  const raceDays = new Set(races.filter((r) => r.status === "completed").map((r) => r.race_date));
  const longestByDay = new Map<string, Activity>();
  for (const a of activities) {
    const day = dayKey(a.started_at);
    if (!raceDays.has(day)) continue;
    const best = longestByDay.get(day);
    if (!best || a.distance_km > best.distance_km) longestByDay.set(day, a);
  }
  return new Set(Array.from(longestByDay.values()).map((a) => a.id));
}

export interface RunTags {
  pr: boolean;
  longest: boolean;
  race: boolean;
}

export function runTags(a: Activity, raceIds: Set<string>): RunTags {
  return {
    pr: a.record_labels.some((l) => l !== "Longest Run"),
    longest: a.record_labels.includes("Longest Run"),
    race: raceIds.has(a.id),
  };
}

export function matchesFilter(a: Activity, filter: FilterKey, raceIds: Set<string>): boolean {
  switch (filter) {
    case "all":
      return true;
    case "outdoor":
      return !isTreadmill(a);
    case "treadmill":
      return isTreadmill(a);
    case "long":
      return a.distance_km >= LONG_RUN_KM;
    case "records":
      return a.record_labels.length > 0 || raceIds.has(a.id);
  }
}

export function matchesQuery(a: Activity, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const date = new Date(a.started_at).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return [runTitle(a), a.location ?? "", typeLabel(a), date, ...a.record_labels].some((s) =>
    s.toLowerCase().includes(q),
  );
}

function compareRuns(sort: SortKey): (a: Activity, b: Activity) => number {
  switch (sort) {
    case "newest":
      return (a, b) => b.started_at.localeCompare(a.started_at);
    case "oldest":
      return (a, b) => a.started_at.localeCompare(b.started_at);
    case "longest":
      return (a, b) => b.distance_km - a.distance_km;
    case "fastest":
      return (a, b) => (a.avg_pace_s_per_km ?? Infinity) - (b.avg_pace_s_per_km ?? Infinity);
  }
}

/* ------------------------------------------------------------------ */
/* Month groups & year summary                                         */
/* ------------------------------------------------------------------ */

export interface MonthGroup {
  key: string; // "2026-9" (year-monthIndex)
  year: number;
  month: number; // 0-11
  label: string; // "October 2026"
  activities: Activity[];
  runs: number;
  km: number;
  avgPace: number | null; // s/km, distance-weighted (total time / total km)
}

export function monthKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** Groups `activities` by month. Months run newest-first (oldest-first for
 * the "oldest" sort); `sort` orders the runs inside each month. */
export function groupByMonth(activities: Activity[], sort: SortKey): MonthGroup[] {
  const byMonth = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = monthKeyOf(a.started_at);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(a);
  }
  const groups: MonthGroup[] = Array.from(byMonth.entries()).map(([key, runs]) => {
    const d = new Date(runs[0].started_at);
    const km = runs.reduce((s, a) => s + a.distance_km, 0);
    const time = runs.reduce((s, a) => s + a.duration_s, 0);
    return {
      key,
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      activities: [...runs].sort(compareRuns(sort)),
      runs: runs.length,
      km,
      avgPace: km > 0 ? time / km : null,
    };
  });
  groups.sort((a, b) => (sort === "oldest" ? 1 : -1) * (a.year * 12 + a.month - (b.year * 12 + b.month)));
  return groups;
}

export interface YearSummary {
  year: number;
  km: number;
  runs: number;
  movingS: number;
  avgPace: number | null;
  months: { month: number; label: string; km: number; partial: boolean }[];
}

export function summarizeYear(activities: Activity[], year: number, now = new Date()): YearSummary {
  const runs = activities.filter((a) => new Date(a.started_at).getFullYear() === year);
  const km = runs.reduce((s, a) => s + a.distance_km, 0);
  const durationS = runs.reduce((s, a) => s + a.duration_s, 0);
  const movingS = runs.reduce((s, a) => s + (a.moving_duration_s ?? a.duration_s), 0);

  const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
  const months = Array.from({ length: lastMonth + 1 }, (_, month) => ({
    month,
    label: new Date(year, month, 1).toLocaleDateString(undefined, { month: "short" }),
    km: runs.filter((a) => new Date(a.started_at).getMonth() === month).reduce((s, a) => s + a.distance_km, 0),
    partial: year === now.getFullYear() && month === now.getMonth(),
  }));
  return { year, km, runs: runs.length, movingS, avgPace: km > 0 ? durationS / km : null, months };
}

/* ------------------------------------------------------------------ */
/* Heart-rate / power zones                                            */
/* ------------------------------------------------------------------ */

export const ZONES = [
  { zone: 1, name: "Warm up", color: "#6e6a9e" },
  { zone: 2, name: "Easy", color: "var(--color-blue)" },
  { zone: 3, name: "Aerobic", color: "var(--color-positive)" },
  { zone: 4, name: "Threshold", color: "var(--color-amber)" },
  { zone: 5, name: "Maximum", color: "var(--color-brand)" },
] as const;

type HrZoneSource = {
  hr_time_in_zone_1: number | null;
  hr_time_in_zone_2: number | null;
  hr_time_in_zone_3: number | null;
  hr_time_in_zone_4: number | null;
  hr_time_in_zone_5: number | null;
};

export function hrZoneSeconds(a: HrZoneSource): number[] {
  return [a.hr_time_in_zone_1, a.hr_time_in_zone_2, a.hr_time_in_zone_3, a.hr_time_in_zone_4, a.hr_time_in_zone_5].map(
    (s) => s ?? 0,
  );
}

export function powerZoneSeconds(d: ActivityDetail): number[] {
  return [d.power_time_in_zone_1, d.power_time_in_zone_2, d.power_time_in_zone_3, d.power_time_in_zone_4, d.power_time_in_zone_5].map(
    (s) => s ?? 0,
  );
}

/** 1-5 zone with the most time and its share of recorded time, or null if none recorded. */
export function dominantZone(seconds: number[]): { zone: number; share: number } | null {
  const total = seconds.reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  const idx = seconds.indexOf(Math.max(...seconds));
  return { zone: idx + 1, share: seconds[idx] / total };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function paceParts(secPerKm: number | null | undefined): { value: string; unit: string } {
  if (secPerKm == null) return { value: "--", unit: "" };
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return m > 0 && s === 60 ? { value: `${m + 1}:00`, unit: "/km" } : { value: `${m}:${String(s).padStart(2, "0")}`, unit: "/km" };
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}

export function hoursMinutes(seconds: number): { h: number; m: number } {
  const total = Math.round(seconds / 60);
  return { h: Math.floor(total / 60), m: total % 60 };
}

export { formatDuration };

export const TRAINING_LABELS: Record<string, { label: string; color: string }> = {
  AEROBIC_BASE: { label: "Aerobic base", color: "var(--color-blue)" },
  RECOVERY: { label: "Recovery", color: "var(--color-positive)" },
  TEMPO: { label: "Tempo", color: "var(--color-amber)" },
  LACTATE_THRESHOLD: { label: "Threshold", color: "var(--color-negative)" },
  VO2MAX: { label: "VO₂ max", color: "var(--color-brand)" },
};

export function trainingBadge(label: string | null): { label: string; color: string } | null {
  if (!label) return null;
  return (
    TRAINING_LABELS[label] ?? {
      label: label.charAt(0) + label.slice(1).toLowerCase().replace(/_/g, " "),
      color: "var(--color-violet)",
    }
  );
}

/* ------------------------------------------------------------------ */
/* Comparisons against your own history                                */
/* ------------------------------------------------------------------ */

const COMPARE_RUNS = 5;

/** Pace of this run minus the average of the up-to-5 runs of the same type just before it
 * (negative = faster). Same basis as the dashboard's Latest run card. */
export function paceDiffVsPrevious(a: Activity, all: Activity[]): { diff: number; n: number } | null {
  if (a.avg_pace_s_per_km == null) return null;
  const earlier = all
    .filter(
      (x) =>
        x.id !== a.id &&
        x.started_at < a.started_at &&
        x.activity_type === a.activity_type &&
        x.avg_pace_s_per_km != null,
    )
    .sort((x, y) => y.started_at.localeCompare(x.started_at))
    .slice(0, COMPARE_RUNS);
  if (earlier.length === 0) return null;
  const baseline = earlier.reduce((s, x) => s + (x.avg_pace_s_per_km as number), 0) / earlier.length;
  return { diff: a.avg_pace_s_per_km - baseline, n: earlier.length };
}

/** Mean of `pick` over this run's same-type runs in the 30 days before it. Needs >= 3 runs. */
export function baseline30d(
  a: Activity,
  all: Activity[],
  pick: (x: Activity) => number | null,
): { mean: number; n: number } | null {
  const end = new Date(a.started_at).getTime();
  const start = end - 30 * 24 * 3600 * 1000;
  const values = all
    .filter((x) => {
      const t = new Date(x.started_at).getTime();
      return x.id !== a.id && x.activity_type === a.activity_type && t >= start && t < end;
    })
    .map(pick)
    .filter((v): v is number => v != null);
  if (values.length < 3) return null;
  return { mean: values.reduce((s, v) => s + v, 0) / values.length, n: values.length };
}

export interface DynamicsRow {
  label: string;
  hint?: string;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
  /** Differences smaller than this count as "= avg". */
  epsilon: number;
  /** Cadence only: a fixed target to flag a run below it. */
  target?: number;
  pick: (x: Activity) => number | null;
}

export const DYNAMICS: DynamicsRow[] = [
  { label: "Cadence", hint: "Target 170+", unit: "spm", decimals: 0, higherIsBetter: true, epsilon: 1, target: 170, pick: (x) => x.avg_cadence },
  { label: "Stride length", unit: "cm", decimals: 1, higherIsBetter: true, epsilon: 0.5, pick: (x) => x.avg_stride_length },
  { label: "Vertical oscillation", hint: "Lower is better", unit: "cm", decimals: 1, higherIsBetter: false, epsilon: 0.15, pick: (x) => x.avg_vertical_oscillation },
  { label: "Vertical ratio", hint: "Lower is better", unit: "%", decimals: 1, higherIsBetter: false, epsilon: 0.15, pick: (x) => x.avg_vertical_ratio },
  { label: "Ground contact time", hint: "Lower is better", unit: "ms", decimals: 0, higherIsBetter: false, epsilon: 2, pick: (x) => x.avg_ground_contact_time },
];

/** Last `n` runs of the same type up to and including `a`, oldest first. */
export function recentRuns(a: Activity, all: Activity[], n = 10): Activity[] {
  return all
    .filter((x) => x.activity_type === a.activity_type && x.started_at <= a.started_at)
    .sort((x, y) => y.started_at.localeCompare(x.started_at))
    .slice(0, n)
    .reverse();
}
