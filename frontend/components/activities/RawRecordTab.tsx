import { formatDuration, type ActivityDetail } from "@/lib/activities";
import { formatPace } from "@/lib/format";

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

/** Every stored column worth showing, in display order (zone columns live on the Overview tab). */
const FIELDS: { label: string; value: (d: ActivityDetail) => string }[] = [
  { label: "Activity Name", value: (d) => fmt(d.activity_name) },
  { label: "Type", value: (d) => fmt(d.activity_type) },
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
  { label: "Temperature (°C)", value: (d) => fmt(d.temperature_c) },
  { label: "Feels Like (°C)", value: (d) => fmt(d.feels_like_c) },
  { label: "Humidity (%)", value: (d) => fmt(d.humidity_pct, 0) },
  { label: "Wind Speed (km/h)", value: (d) => fmt(d.wind_speed_kmh) },
  { label: "Precipitation (mm)", value: (d) => fmt(d.precipitation_mm) },
  { label: "Weather Condition", value: (d) => fmt(d.weather_condition) },
];

export default function RawRecordTab({ detail }: { detail: ActivityDetail | "loading" | "error" | undefined }) {
  if (typeof detail !== "object") {
    return (
      <p className={"px-6 pb-6 pt-[22px] text-sm " + (detail === "error" ? "text-negative" : "text-text-muted")}>
        {detail === "error" ? "Failed to load this run's record." : "Loading details…"}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-6 pb-6 pt-[22px] sm:grid-cols-3">
      {FIELDS.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
          <div className="truncate text-sm" title={value(detail)}>
            {value(detail)}
          </div>
        </div>
      ))}
    </div>
  );
}
