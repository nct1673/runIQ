import Gauge, { type GaugePoint } from "@/components/video-analysis/Gauge";
import {
  ELBOW,
  FOOT_AHEAD,
  type GaugeDef,
  KNEE_MS,
  KNEE_TD,
  SHANK,
  TRUNK,
  judge,
  pct,
} from "@/components/video-analysis/ranges";
import type { AnalysisResult } from "@/components/video-analysis/types";

const SWING_AXIS = { axis: [-90, 60] } as GaugeDef; // only `axis` is read by pct()
const STRIDE_COLORS = ["var(--color-brand)", "var(--color-violet)", "var(--color-amber)", "var(--color-blue)"];
const BADGE = {
  good: "bg-positive/10 text-positive",
  warn: "bg-amber/15 text-amber",
  info: "bg-blue/10 text-blue",
};

function Badge({ tone, children }: { tone: keyof typeof BADGE; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-[3px] text-[11px] font-semibold ${BADGE[tone]}`}>{children}</span>;
}

function PhaseCard({
  color,
  title,
  sub,
  children,
}: {
  color: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-1.5 flex items-center justify-between">
        <b className="flex items-center gap-2 text-[15px] font-semibold">
          <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          {title}
        </b>
        <span className="text-xs text-text-muted">{sub}</span>
      </div>
      {children}
    </div>
  );
}

/** One metric row: name + badge, big value(s), gauge. `values` is one number per analysed stride. */
function Metric({ def, values, hint }: { def: GaugeDef; values: number[]; hint?: string }) {
  if (values.length === 0) return null;
  const j = judge(def, values);
  const points: GaugePoint[] = values.map((v, i) => ({
    value: v,
    color: STRIDE_COLORS[i % STRIDE_COLORS.length],
    label: values.length > 1 ? String(i + 1) : undefined,
  }));
  return (
    <div className="border-t border-border py-3.5 first:border-t-0">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-soft">{def.name}</span>
        <Badge tone={j.tone}>{j.label}</Badge>
      </div>
      <div className="mb-2.5 mt-2 flex items-baseline gap-3.5">
        {values.map((v, i) => (
          <span key={i} className="flex items-baseline gap-3.5">
            {i > 0 && <span className="h-[18px] w-px self-center bg-border-strong" />}
            <b className="text-2xl font-semibold tracking-tight">
              {v.toFixed(def.decimals)}
              {def.unit}
              {values.length > 1 && <small className="ml-0.5 text-[11px] font-medium text-text-muted">S{i + 1}</small>}
            </b>
          </span>
        ))}
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </div>
      <Gauge def={def} points={points} />
    </div>
  );
}

const gapPct = (vals: number[]) => {
  if (vals.length < 2) return null;
  const a = Math.abs(vals[0]);
  const b = Math.abs(vals[1]);
  const hi = Math.max(a, b);
  return hi === 0 ? 0 : (Math.abs(a - b) / hi) * 100;
};

/** How far the first two strides differ for each paired metric; dashed line = the 15% flag. */
function StrideDifference({ rows }: { rows: { label: string; values: number[] }[] }) {
  const gaps = rows.map((r) => ({ label: r.label, gap: gapPct(r.values) })).filter((r) => r.gap != null) as {
    label: string;
    gap: number;
  }[];
  if (gaps.length === 0) return null;
  return (
    <div className="mt-1.5 rounded-xl border border-border bg-surface-hover p-3.5">
      <div className="mb-2.5 flex justify-between text-xs text-text-muted">
        <span>Stride 1 vs stride 2 difference</span>
        <span>dashed = 15% flag</span>
      </div>
      <div className="grid grid-cols-[90px_1fr_46px] items-center gap-x-2.5 gap-y-2.5 text-xs text-text-soft">
        {gaps.map(({ label, gap }) => {
          const flagged = gap > 15;
          return (
            <div key={label} className="contents">
              <span>{label}</span>
              <div className="relative h-1.5 rounded-full bg-surface">
                <div
                  className="absolute inset-y-0 left-0 rounded-[3px]"
                  style={{ width: `${Math.min(100, (gap / 30) * 100)}%`, background: flagged ? "var(--color-amber)" : "var(--color-positive)" }}
                />
                <div className="absolute -inset-y-[3px] left-1/2 border-l border-dashed border-text-muted" />
              </div>
              <b className={"text-right " + (flagged ? "text-amber" : "")}>{gap.toFixed(0)}%</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PhaseCards({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  const td = result.touchdown_frames;
  const ms = result.midstance_frames;
  const frames = (fs: number[]) => (fs.length ? `Frames ${fs.join(" · ")}` : "");
  const swing = m.arm_swing;
  const zeroAt = pct(SWING_AXIS, 0);

  return (
    <section className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 2xl:grid-cols-3">
      <PhaseCard color="var(--color-brand)" title="Touchdown" sub={frames(td)}>
        <Metric def={SHANK} values={m.shank_angle_td} />
        <Metric def={FOOT_AHEAD} values={m.overstride_calf_td} hint="calf lengths" />
        <Metric def={KNEE_TD} values={m.knee_flexion_td} />
      </PhaseCard>

      <PhaseCard color="var(--color-positive)" title="Midstance" sub={frames(ms)}>
        <Metric def={KNEE_MS} values={m.knee_flexion_ms} />
        <StrideDifference
          rows={[
            { label: "Shank angle", values: m.shank_angle_td },
            { label: "Knee @ TD", values: m.knee_flexion_td },
            { label: "Knee @ MS", values: m.knee_flexion_ms },
            { label: "Foot ahead", values: m.overstride_calf_td },
          ]}
        />
      </PhaseCard>

      <PhaseCard color="var(--color-violet)" title="Posture & arms" sub="Stride average">
        {m.trunk_lean != null && <Metric def={TRUNK} values={[m.trunk_lean]} hint="forward" />}
        {m.elbow_angle != null && <Metric def={ELBOW} values={[m.elbow_angle]} />}
        {swing && (
          <div className="border-t border-border py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-soft">Arm swing range</span>
              <Badge tone="info">{swing.max < 0 ? "Mostly behind" : swing.min > 0 ? "Mostly ahead" : "Both sides"}</Badge>
            </div>
            <div className="mb-2.5 mt-2 flex items-baseline gap-3.5">
              <b className="text-2xl font-semibold tracking-tight">{swing.range.toFixed(0)}°</b>
              <span className="text-xs text-text-muted">
                {swing.min.toFixed(0)}° → {swing.max.toFixed(0)}° from vertical
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-hover">
              <div className="absolute -inset-y-1 border-l-[1.5px] border-dashed border-text-soft" style={{ left: `${zeroAt}%` }} />
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: `${pct(SWING_AXIS, swing.min)}%`,
                  width: `${pct(SWING_AXIS, swing.max) - pct(SWING_AXIS, swing.min)}%`,
                  background: "linear-gradient(90deg,#38d6ff,#a27bff)",
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10.5px] text-text-muted">
              <span>−90° back</span>
              <span>0° vertical</span>
              <span>+60° forward</span>
            </div>
          </div>
        )}
      </PhaseCard>
    </section>
  );
}
