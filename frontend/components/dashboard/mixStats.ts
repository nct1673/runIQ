import type { LatestRunActivity } from "@/components/LatestRunCard";

/** /api/activities row, with the extra fields the dashboard's mix cards read. */
export interface DashboardActivity extends LatestRunActivity {
  hr_time_in_zone_1?: number | null;
  hr_time_in_zone_2?: number | null;
  hr_time_in_zone_3?: number | null;
  hr_time_in_zone_4?: number | null;
  hr_time_in_zone_5?: number | null;
  training_effect_label?: string | null;
}

/** All three mix cards look at the same recent window. */
export const MIX_WINDOW_DAYS = 30;

/** Share of easy time (HR zones 1-2) the "easy/hard" card treats as on target (the 80/20 rule). */
export const EASY_TARGET_PCT = 80;

function recent(activities: DashboardActivity[]): DashboardActivity[] {
  const cutoff = Date.now() - MIX_WINDOW_DAYS * 86_400_000;
  return activities.filter((a) => new Date(a.started_at).getTime() >= cutoff);
}

export interface SurfaceSplit {
  roadKm: number;
  treadmillKm: number;
  roadPace: number | null; // s/km, distance-weighted
  treadmillPace: number | null;
}

/** Outdoor ("running") vs treadmill ("treadmill_running") distance and pace. */
export function surfaceSplit(activities: DashboardActivity[]): SurfaceSplit {
  const pick = (type: string) => {
    const rows = recent(activities).filter((a) => a.activity_type === type);
    const km = rows.reduce((s, a) => s + a.distance_km, 0);
    const secs = rows.reduce((s, a) => s + a.duration_s, 0);
    return { km, pace: km > 0 ? secs / km : null };
  };
  const road = pick("running");
  const tread = pick("treadmill_running");
  return { roadKm: road.km, treadmillKm: tread.km, roadPace: road.pace, treadmillPace: tread.pace };
}

export interface IntensitySplit {
  easy: number; // seconds in zones 1-2
  moderate: number; // zone 3
  hard: number; // zones 4-5
}

/** Time in HR zones, bucketed easy / moderate / hard. Runs without zone data are skipped. */
export function intensitySplit(activities: DashboardActivity[]): IntensitySplit {
  const out = { easy: 0, moderate: 0, hard: 0 };
  for (const a of recent(activities)) {
    out.easy += (a.hr_time_in_zone_1 ?? 0) + (a.hr_time_in_zone_2 ?? 0);
    out.moderate += a.hr_time_in_zone_3 ?? 0;
    out.hard += (a.hr_time_in_zone_4 ?? 0) + (a.hr_time_in_zone_5 ?? 0);
  }
  return out;
}

/** Run count per Garmin training-effect label, most common first. */
export function trainingEffectMix(activities: DashboardActivity[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of recent(activities)) {
    if (a.training_effect_label) counts.set(a.training_effect_label, (counts.get(a.training_effect_label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
