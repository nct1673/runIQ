export interface TypeSplitEntry {
  activity_type: string;
  runs: number;
  distance_km: number;
}

const TYPE_LABEL: Record<string, string> = {
  running: "Outdoor Run",
  treadmill_running: "Treadmill Run",
  unknown: "Other",
};

// Fixed categorical assignment -- matches the colors ActivityCard already
// uses for the same two types, so identity stays consistent across pages.
const TYPE_COLOR: Record<string, string> = {
  running: "bg-stat-runs",
  treadmill_running: "bg-stat-time",
  unknown: "bg-text-muted",
};

/** Distance breakdown by activity type -- a real split the activities
 * table supports today, standing in for a HR-zone split (no zone
 * thresholds exist in the schema yet). */
export default function TypeSplitChart({ data }: { data: TypeSplitEntry[] }) {
  if (data.length === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-text-muted">No runs yet</p>;
  }

  const total = data.reduce((sum, d) => sum + d.distance_km, 0) || 1;

  return (
    <div className="flex h-[160px] flex-col justify-center gap-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bg">
        {data.map((d, i) => (
          <div
            key={d.activity_type}
            className={(TYPE_COLOR[d.activity_type] ?? "bg-text-muted") + (i > 0 ? " ml-0.5" : "")}
            style={{ width: `${(d.distance_km / total) * 100}%` }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {data.map((d) => (
          <div key={d.activity_type} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLOR[d.activity_type] ?? "bg-text-muted"}`} />
              <span className="text-text">{TYPE_LABEL[d.activity_type] ?? d.activity_type}</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <span>{d.runs} run{d.runs === 1 ? "" : "s"}</span>
              <span className="font-medium text-text">{d.distance_km.toFixed(0)} km</span>
              <span className="w-10 text-right">{((d.distance_km / total) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
