import { formatDuration } from "@/lib/format";

export interface ZoneDatum {
  zone: number;
  seconds: number;
}

const ZONE_COLOR: Record<number, string> = {
  1: "#8b8f9c", // slate -- matches text-muted, "easiest" zone
  2: "#3b82f6", // blue
  3: "#22c55e", // green
  4: "#f97316", // orange
  5: "#ef4444", // red -- hardest zone
};

/** Generic 5-zone descriptors -- Garmin's own fixed zone-1..5 naming
 * scheme, not derived from per-user bpm/watt thresholds (which nothing
 * in the DB stores yet, so no numeric range is shown, unlike the
 * reference design). */
const ZONE_LABEL: Record<number, string> = {
  1: "Warm Up",
  2: "Easy",
  3: "Aerobic",
  4: "Threshold",
  5: "Maximum",
};

/** Per-zone time-in-zone bars, Zone 5 (hardest) at top down to Zone 1 --
 * used for both Heart Rate Zones and Power Zones, whose data ships as
 * five parallel Activity columns (hr_time_in_zone_1..5 /
 * power_time_in_zone_1..5). Bar fill is proportional to this activity's
 * own total zone time, not to some fixed max. */
export default function ZoneBars({ title, zones }: { title: string; zones: ZoneDatum[] }) {
  const total = zones.reduce((sum, z) => sum + z.seconds, 0);
  if (total === 0) {
    return null;
  }

  const sorted = [...zones].sort((a, b) => b.zone - a.zone);

  return (
    <div>
      <h4 className="mb-3 text-sm font-medium text-text">{title}</h4>
      <div className="flex flex-col gap-3">
        {sorted.map(({ zone, seconds }) => {
          const pct = total > 0 ? (seconds / total) * 100 : 0;
          return (
            <div key={zone}>
              <div className="mb-1 text-xs text-text-muted">
                <span className="font-medium text-text">Zone {zone}</span> · {ZONE_LABEL[zone]}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(pct, seconds > 0 ? 2 : 0)}%`, backgroundColor: ZONE_COLOR[zone] }}
                  />
                </div>
                <div className="flex w-24 shrink-0 items-center justify-end gap-2 text-xs text-text-muted">
                  <span>{formatDuration(seconds)}</span>
                  <span className="w-9 text-right">{Math.round(pct)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
