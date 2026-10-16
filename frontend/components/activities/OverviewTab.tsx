import {
  DYNAMICS,
  ZONES,
  baseline30d,
  formatDuration,
  hrZoneSeconds,
  isTreadmill,
  powerZoneSeconds,
  type Activity,
  type DetailState,
  type DynamicsRow,
} from "@/lib/activities";

import { DataUnavailable, Notice, SubPanel, WeatherGlyph } from "./shared";

/** One row of the zone table: swatch, name, share bar, time, percent. */
function ZoneRow({ name, color, seconds, total }: { name: string; color: string; seconds: number; total: number }) {
  const pct = total > 0 ? (seconds / total) * 100 : 0;
  return (
    <div
      className={
        "grid h-[26px] grid-cols-[14px_96px_1fr_42px_36px] items-center gap-2.5 text-xs text-text-muted " +
        (seconds === 0 ? "opacity-45" : "")
      }
    >
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      <span className="whitespace-nowrap text-text-soft">{name}</span>
      <span className="relative h-1.5 rounded-full bg-white/5">
        {seconds > 0 && (
          <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color }} />
        )}
      </span>
      <span className="text-right font-semibold text-text">{formatDuration(seconds)}</span>
      <span className="text-right">{Math.round(pct)}%</span>
    </div>
  );
}

function HeartRateZones({ activity }: { activity: Activity }) {
  const seconds = hrZoneSeconds(activity);
  const total = seconds.reduce((s, v) => s + v, 0);
  return (
    <SubPanel
      title="Heart-rate zones"
      accent="var(--color-blue)"
      right={total > 0 ? `${formatDuration(total)} recorded` : undefined}
    >
      {total === 0 ? (
        <DataUnavailable>no heart-rate zone data for this run.</DataUnavailable>
      ) : (
        <>
          <div className="mb-3.5 flex h-3 gap-0.5 overflow-hidden rounded-full">
            {seconds.map((s, i) =>
              s > 0 ? <i key={i} style={{ width: `${(s / total) * 100}%`, background: ZONES[i].color }} /> : null,
            )}
          </div>
          {ZONES.map((z, i) => (
            <ZoneRow key={z.zone} name={`Z${z.zone} ${z.name}`} color={z.color} seconds={seconds[i]} total={total} />
          ))}
        </>
      )}
    </SubPanel>
  );
}

function DynamicRow({ row, activity, all }: { row: DynamicsRow; activity: Activity; all: Activity[] }) {
  const value = row.pick(activity);
  const baseline = value != null ? baseline30d(activity, all, row.pick) : null;
  const belowTarget = row.target != null && value != null && value < row.target;

  let text = "";
  let color = "var(--color-text-muted)";
  if (value != null && baseline) {
    const delta = value - baseline.mean;
    if (Math.abs(delta) < row.epsilon) {
      text = "= avg";
    } else {
      const better = row.higherIsBetter ? delta > 0 : delta < 0;
      text = `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(row.decimals)} ${row.unit}`;
      color = better ? "var(--color-positive)" : "var(--color-amber)";
    }
    if (belowTarget) {
      text += " · low";
      if (color === "var(--color-text-muted)") color = "var(--color-amber)";
    }
  } else if (value != null) {
    text = belowTarget ? "low" : "no baseline";
    if (belowTarget) color = "var(--color-amber)";
  }

  return (
    <div className="grid grid-cols-[1fr_auto_74px] items-center gap-2.5 border-t border-border py-2.5 text-[12.5px] first:border-t-0 first:pt-0">
      <span className="text-text-soft">
        {row.label}
        {row.hint && <span className="mt-0.5 block text-[11px] text-text-muted">{row.hint}</span>}
      </span>
      <b className="text-[17px] font-semibold tabular-nums">
        {value != null ? value.toFixed(row.decimals) : "--"}
        {value != null && <em className="ml-0.5 text-[11.5px] font-medium not-italic text-text-muted">{row.unit}</em>}
      </b>
      <span className="text-right text-[11.5px] font-semibold" style={{ color }}>
        {text}
      </span>
    </div>
  );
}

function RunningDynamics({ activity, all }: { activity: Activity; all: Activity[] }) {
  const any = DYNAMICS.some((r) => r.pick(activity) != null);
  return (
    <SubPanel title="Running dynamics" accent="var(--color-positive)" right="vs your 30-day avg">
      {any ? (
        DYNAMICS.map((row) => <DynamicRow key={row.label} row={row} activity={activity} all={all} />)
      ) : (
        <DataUnavailable>this run has no running-dynamics sensor data.</DataUnavailable>
      )}
    </SubPanel>
  );
}

function Kv({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div>
      <small className="block text-[11px] text-text-muted">{label}</small>
      <b className="mt-[3px] block text-[17px] font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
        {unit && <em className="ml-0.5 text-[11.5px] font-medium not-italic text-text-muted">{unit}</em>}
      </b>
    </div>
  );
}

function Pending({ state }: { state: "loading" | "error" | undefined }) {
  return (
    <p className={"text-xs " + (state === "error" ? "text-negative" : "text-text-muted")}>
      {state === "error" ? "Failed to load this run's details." : "Loading details…"}
    </p>
  );
}

function PowerPanel({ activity, detail }: { activity: Activity; detail: DetailState }) {
  if (typeof detail !== "object") {
    return (
      <SubPanel title="Power" accent="var(--color-violet)">
        <Pending state={detail} />
      </SubPanel>
    );
  }
  const zones = powerZoneSeconds(detail);
  const zoneTotal = zones.reduce((s, v) => s + v, 0);
  const runSeconds = detail.moving_duration_s ?? detail.duration_s;
  const sparse = zoneTotal > 0 && zoneTotal / runSeconds < 0.5;

  return (
    <SubPanel title="Power" accent="var(--color-violet)">
      {detail.avg_power == null && detail.norm_power == null ? (
        <DataUnavailable>{isTreadmill(activity) ? "no power sensor data for this treadmill run." : "no power data for this run."}</DataUnavailable>
      ) : (
        <>
          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <Kv label="Avg power" value={detail.avg_power != null ? String(Math.round(detail.avg_power)) : "--"} unit="W" />
            <Kv
              label="Normalized power"
              value={detail.norm_power != null ? String(Math.round(detail.norm_power)) : "--"}
              unit="W"
            />
          </div>
          {zones.map((s, i) =>
            s > 0 ? (
              <ZoneRow key={i} name={`Z${i + 1} ${ZONES[i].name}`} color="var(--color-violet)" seconds={s} total={zoneTotal} />
            ) : null,
          )}
          {sparse && (
            <Notice>
              Power zones cover only {formatDuration(zoneTotal)} of a {formatDuration(runSeconds)} run. The sensor likely
              dropped out, so zone data for this run is unreliable.
            </Notice>
          )}
        </>
      )}
    </SubPanel>
  );
}

function Conditions({ activity, detail }: { activity: Activity; detail: DetailState }) {
  if (typeof detail !== "object") {
    return (
      <SubPanel title="Conditions" accent="var(--color-amber)" right="at start">
        <Pending state={detail} />
      </SubPanel>
    );
  }
  const hot = detail.feels_like_c != null && detail.temperature_c != null && detail.feels_like_c - detail.temperature_c >= 3;
  return (
    <SubPanel title="Conditions" accent="var(--color-amber)" right="at start">
      {detail.temperature_c == null ? (
        <DataUnavailable>
          {isTreadmill(activity) ? "treadmill runs have no GPS to look weather up against." : "no weather was matched to this run."}
        </DataUnavailable>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-3.5">
          <Kv label="Temperature" value={detail.temperature_c.toFixed(1)} unit="°C" />
          <Kv
            label="Feels like"
            value={detail.feels_like_c != null ? detail.feels_like_c.toFixed(1) : "--"}
            unit={detail.feels_like_c != null ? "°C" : undefined}
            accent={hot ? "var(--color-amber)" : undefined}
          />
          <Kv label="Humidity" value={detail.humidity_pct != null ? String(Math.round(detail.humidity_pct)) : "--"} unit={detail.humidity_pct != null ? "%" : undefined} />
          <div>
            <small className="block text-[11px] text-text-muted">Weather</small>
            <b className="mt-[3px] flex items-center gap-1.5 text-[17px] font-semibold">
              <WeatherGlyph condition={detail.weather_condition} className="h-4 w-4 text-text-soft" />
              {detail.weather_condition ?? "--"}
            </b>
          </div>
          <Kv label="Precipitation" value={detail.precipitation_mm != null ? detail.precipitation_mm.toFixed(1) : "--"} unit={detail.precipitation_mm != null ? "mm" : undefined} />
          <Kv label="Wind" value={detail.wind_speed_kmh != null ? detail.wind_speed_kmh.toFixed(1) : "--"} unit={detail.wind_speed_kmh != null ? "km/h" : undefined} />
        </div>
      )}
    </SubPanel>
  );
}

export default function OverviewTab({
  activity,
  detail,
  all,
}: {
  activity: Activity;
  detail: DetailState;
  all: Activity[];
}) {
  return (
    <div className="grid grid-cols-1 gap-[18px] px-6 pb-6 pt-[22px] @2xl:grid-cols-2">
      <RunningDynamics activity={activity} all={all} />
      <HeartRateZones activity={activity} />
      <PowerPanel activity={activity} detail={detail} />
      <Conditions activity={activity} detail={detail} />
    </div>
  );
}
