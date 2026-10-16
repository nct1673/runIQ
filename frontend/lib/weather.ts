/** Types + pure helpers for the Analytics "Weather & conditions" section.
 * Mirrors GET /api/analytics/weather-impact (app.schemas.analytics.WeatherImpactOut);
 * the maths itself lives in backend/app/services/weather_impact_service.py. */
import { formatPace } from "@/lib/format";

export interface WeatherRun {
  activity_id: string;
  started_at: string;
  hour: number; // local start time, 0-24
  feels_like_c: number;
  temperature_c: number | null;
  pace_s_per_km: number;
  avg_hr: number | null;
  distance_km: number;
  easy: boolean;
  same_effort_pace_s_per_km: number | null;
  heat_adjusted_pace_s_per_km: number | null;
}

export interface HeatModel {
  heat_s_per_km_per_c: number;
  heat_se: number;
  ci_low: number;
  ci_high: number;
  hr_s_per_km_per_bpm: number;
  r2: number;
  n: number;
  confidence: "high" | "moderate" | "low";
  feels_like_min: number;
  feels_like_max: number;
  mean_feels_like_c: number;
  mean_same_effort_pace_s_per_km: number;
}

export interface MonthlyHeatCost {
  month: string; // "2026-04-01"
  runs: number;
  spread_c: number | null;
  slope_s_per_km_per_c: number | null;
  se: number | null;
  reliable: boolean;
  reason: string | null;
}

export interface HeatCostChange {
  from_month: string;
  to_month: string;
  from_value: number;
  to_value: number;
  pct_change: number;
  confidence: "ok" | "low";
}

export interface WeeklyAdjusted {
  week_start: string;
  runs: number;
  actual_pace_s_per_km: number;
  adjusted_pace_s_per_km: number;
}

export interface AdjustedSummary {
  from_month: string;
  to_month: string;
  actual_from: number;
  actual_to: number;
  adjusted_from: number;
  adjusted_to: number;
  weather_share_s: number;
}

export interface WeatherImpact {
  months: number;
  reference_hr_bpm: number;
  reference_feels_like_c: number;
  outdoor_runs: number;
  easy_runs: number;
  model: HeatModel | null;
  model_unavailable_reason: string | null;
  runs: WeatherRun[];
  monthly: MonthlyHeatCost[];
  heat_cost_change: HeatCostChange | null;
  weekly: WeeklyAdjusted[];
  adjusted_summary: AdjustedSummary | null;
}

/* ------------------------------ formatting ------------------------------ */

export const mmss = (s: number) => formatPace(s).replace("/km", "");

export const signed = (n: number, digits = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;

/** "m:ss" difference with a sign, e.g. "−53 s" or "+1:05". */
export function signedSeconds(s: number): string {
  const sign = s >= 0 ? "+" : "−";
  const a = Math.abs(Math.round(s));
  return a >= 120 ? `${sign}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}` : `${sign}${a} s`;
}

export function monthShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

export function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/** [6, 8] -> "6–8 AM"; [10, 12] -> "10 AM–12 PM". */
export function windowLabel(start: number, end: number): string {
  const a = hourLabel(start);
  const b = hourLabel(end);
  const aSuffix = a.split(" ")[1];
  return aSuffix === b.split(" ")[1] ? `${a.split(" ")[0]}–${b}` : `${a}–${b}`;
}

/* ------------------------------ time of day ------------------------------ */

export const MIN_BUCKET_RUNS = 5; // fewer runs than this are drawn faded

export interface TimeBucket {
  start: number;
  end: number;
  center: number;
  n: number;
  meanPace: number | null;
}

/** Two-hour start-time windows from 4 AM to 10 PM, with run count and mean pace. */
export function timeBuckets(points: { hour: number; pace: number }[]): TimeBucket[] {
  const out: TimeBucket[] = [];
  for (let start = 4; start < 22; start += 2) {
    const inside = points.filter((p) => p.hour >= start && p.hour < start + 2);
    const mean = (f: (p: (typeof points)[number]) => number) =>
      inside.length ? inside.reduce((s, p) => s + f(p), 0) / inside.length : null;
    out.push({
      start,
      end: start + 2,
      center: start + 1,
      n: inside.length,
      meanPace: mean((p) => p.pace),
    });
  }
  return out;
}

/* --------------------------------- axes --------------------------------- */

/** Gridline values covering [min, max] with at most `maxIntervals` steps, using the
 * smallest step from `steps` that fits (so a 150 s range gets 30 s gridlines, not 200 s). */
export function stepTicks(min: number, max: number, steps: number[], maxIntervals = 5): number[] {
  const range = Math.max(max - min, 1e-9);
  const step = steps.find((s) => range / s <= maxIntervals) ?? steps[steps.length - 1];
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = start; v <= end + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out.length >= 2 ? out : [start, start + step];
}

/** Pace gridlines in seconds per km. */
export const paceTicks = (min: number, max: number) => stepTicks(min, max, [10, 15, 20, 30, 60, 120, 300]);

/** Gridlines for the heat-cost slope (s/km per °C). */
export const slopeTicks = (min: number, max: number) => stepTicks(min, max, [0.5, 1, 2, 5, 10, 20, 50]);

/** "12 Oct", matching how dates are written on the Activities page. */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString(undefined, { month: "short" })}`;
}
