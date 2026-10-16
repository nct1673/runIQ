import { vdotScore } from "@/lib/vdot";

export interface PersonalRecord {
  id: string;
  type_id: number;
  label: string;
  metric: "time_s" | "distance_m";
  value: number;
  activity_name: string | null;
  achieved_at: string | null;
}

/** Timed PR types, matching garmin_personal_records_loader.KNOWN_TYPES.
 * type_id 7 (Longest Run) is a distance, not a timed effort. */
export const RACE_DISTANCES = [
  { typeId: 1, label: "1 km", meters: 1000 },
  { typeId: 2, label: "1 mile", meters: 1609.34 },
  { typeId: 3, label: "5 km", meters: 5000 },
  { typeId: 4, label: "10 km", meters: 10000 },
  { typeId: 5, label: "Half Marathon", meters: 21097.5 },
  { typeId: 6, label: "Marathon", meters: 42195 },
] as const;

export const LONGEST_RUN_TYPE_ID = 7;

export function recordVdot(record: PersonalRecord | undefined, meters: number): number | null {
  if (!record || record.metric !== "time_s") return null;
  return vdotScore(meters, record.value);
}

/** "Jul 21, 2026" */
export function formatLongDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "11 days ago" / "3 mo ago" */
export function agoLabel(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return `${Math.round(days / 30.4)} mo ago`;
}

export function isRecent(iso: string | null, days = 30): boolean {
  return iso != null && Date.now() - new Date(iso).getTime() < days * 86_400_000;
}

/** The strongest timed PR by VDOT: the score and which distance it came from. */
export function bestVdot(records: PersonalRecord[] | null): { vdot: number; label: string } | null {
  let best: { vdot: number; label: string } | null = null;
  for (const d of RACE_DISTANCES) {
    const v = recordVdot(
      records?.find((r) => r.type_id === d.typeId),
      d.meters,
    );
    if (v != null && (best == null || v > best.vdot)) best = { vdot: v, label: d.label };
  }
  return best;
}
