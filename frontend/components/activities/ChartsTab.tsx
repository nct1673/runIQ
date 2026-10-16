import { formatDuration, paceParts, recentRuns, type Activity } from "@/lib/activities";

import { DataUnavailable, SubPanel } from "./shared";

interface MetricSpec {
  title: string;
  accent: string;
  /** Lower value is the better result (pace). */
  lowerIsBetter: boolean;
  pick: (a: Activity) => number | null;
  format: (v: number) => string;
  deltaFormat: (d: number) => string;
}

const sign = (d: number) => (d > 0 ? "+" : "−");

const METRICS: MetricSpec[] = [
  {
    title: "Pace",
    accent: "var(--color-brand)",
    lowerIsBetter: true,
    pick: (a) => a.avg_pace_s_per_km,
    format: (v) => paceParts(v).value + "/km",
    deltaFormat: (d) => `${sign(d)}${formatDuration(Math.abs(d))}/km`,
  },
  {
    title: "Average heart rate",
    accent: "var(--color-blue)",
    lowerIsBetter: true,
    pick: (a) => a.avg_hr,
    format: (v) => `${Math.round(v)} bpm`,
    deltaFormat: (d) => `${sign(d)}${Math.abs(d).toFixed(0)} bpm`,
  },
  {
    title: "Cadence",
    accent: "var(--color-positive)",
    lowerIsBetter: false,
    pick: (a) => a.avg_cadence,
    format: (v) => `${Math.round(v)} spm`,
    deltaFormat: (d) => `${sign(d)}${Math.abs(d).toFixed(0)} spm`,
  },
  {
    title: "Distance",
    accent: "var(--color-amber)",
    lowerIsBetter: false,
    pick: (a) => a.distance_km,
    format: (v) => `${v.toFixed(2)} km`,
    deltaFormat: (d) => `${sign(d)}${Math.abs(d).toFixed(2)} km`,
  },
];

function MetricChart({ spec, runs, selectedId }: { spec: MetricSpec; runs: Activity[]; selectedId: string }) {
  const points = runs.map((r) => ({ run: r, value: spec.pick(r) })).filter((p): p is { run: Activity; value: number } => p.value != null);
  const current = points.find((p) => p.run.id === selectedId);
  const others = points.filter((p) => p.run.id !== selectedId);

  if (!current || points.length < 2) {
    return (
      <SubPanel title={spec.title} accent={spec.accent}>
        <DataUnavailable>not enough runs with this metric to compare.</DataUnavailable>
      </SubPanel>
    );
  }

  const mean = others.reduce((s, p) => s + p.value, 0) / others.length;
  const delta = current.value - mean;
  const better = spec.lowerIsBetter ? delta < 0 : delta > 0;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <SubPanel title={spec.title} accent={spec.accent} right={`last ${points.length} runs`}>
      <div className="flex items-baseline gap-2.5">
        <b className="text-[22px] font-semibold tabular-nums">{spec.format(current.value)}</b>
        <span className="text-xs font-semibold" style={{ color: better ? "var(--color-positive)" : "var(--color-amber)" }}>
          {spec.deltaFormat(delta)} vs avg
        </span>
      </div>
      <div className="mt-3.5 flex h-[72px] items-end gap-1" role="img" aria-label={`${spec.title} over the last ${points.length} runs`}>
        {points.map(({ run, value }) => {
          const isCurrent = run.id === selectedId;
          const height = 14 + (max === min ? 0.5 : (value - min) / (max - min)) * 58;
          return (
            <div
              key={run.id}
              title={`${new Date(run.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${spec.format(value)}`}
              className="flex-1 rounded-t-[4px] rounded-b-[2px]"
              style={{
                height,
                background: isCurrent ? "linear-gradient(180deg, #a27bff, #ff4d8d)" : "#3f3a72",
              }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-text-muted">
        <span>{new Date(points[0].run.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span>avg of others {spec.format(mean)}</span>
      </div>
    </SubPanel>
  );
}

/** This run against your own last 10 runs of the same type -- real values
 * from /api/activities, not per-second data (the database has none). */
export default function ChartsTab({ activity, all }: { activity: Activity; all: Activity[] }) {
  const runs = recentRuns(activity, all, 10);
  return (
    <div className="px-6 pb-6 pt-[22px]">
      <p className="mb-3.5 text-xs text-text-muted">
        This run (highlighted) against your previous {Math.max(0, runs.length - 1)} runs of the same type. Within-run
        heart-rate and pace charts will appear once per-second data is imported.
      </p>
      <div className="grid grid-cols-1 gap-[18px] @2xl:grid-cols-2">
        {METRICS.map((m) => (
          <MetricChart key={m.title} spec={m} runs={runs} selectedId={activity.id} />
        ))}
      </div>
    </div>
  );
}
