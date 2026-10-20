import { formatPace } from "@/lib/format";

function Mini({
  accent,
  label,
  value,
  unit,
  foot,
}: {
  accent: string; // any #rrggbb colour: top edge, tint, label dot and unit
  label: string;
  value: string;
  unit?: string;
  foot?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5"
      style={{
        borderColor: `${accent}33`,
        background: `linear-gradient(135deg, ${accent}1f, transparent 65%), var(--color-surface-hover)`,
        boxShadow: `inset 0 3px 0 ${accent}`,
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-soft">
          <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          {label}
        </div>
        {foot && <div className="mt-1 text-xs">{foot}</div>}
      </div>
      <div className="w-[120px] shrink-0 whitespace-nowrap text-left text-[28px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-medium" style={{ color: accent }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/** Secondary fitness numbers, deliberately small -- context for the hero
 * card, not a chart in their own right. */
export default function FitnessSnapshotCard({
  vo2Max,
  easyPaceSPerKm,
  easyRunCount,
  avgWeeklyKm,
  vdot,
}: {
  vo2Max: number | null | undefined;
  easyPaceSPerKm: number | null; // mean pace of easy runs, last 2 months
  easyRunCount: number;
  avgWeeklyKm: number | null;
  vdot: { vdot: number; label: string } | null; // best PR-derived VDOT and its distance
}) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-amber" />
          Fitness snapshot
        </div>
        <span className="text-xs text-text-muted">Recent form</span>
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-2.5">
        <Mini
          accent="#a27bff"
          label="VDOT"
          value={vdot ? vdot.vdot.toFixed(1) : "--"}
          foot={<span className="text-text-muted">{vdot ? `From your ${vdot.label} PR` : "No PR yet"}</span>}
        />
        <Mini
          accent="#ff4d8d"
          label="VO2 Max"
          value={vo2Max != null ? vo2Max.toFixed(1) : "--"}
        />
        <Mini
          accent="#b6f35a"
          label="Easy run pace"
          value={easyPaceSPerKm != null ? formatPace(easyPaceSPerKm).replace("/km", "") : "--"}
          unit={easyPaceSPerKm != null ? "/km" : undefined}
          foot={<span className="text-text-muted">Last 2 months{easyRunCount ? ` · ${easyRunCount} runs` : ""}</span>}
        />
        <Mini
          accent="#38d6ff"
          label="Weekly avg"
          value={avgWeeklyKm != null ? avgWeeklyKm.toFixed(1) : "--"}
          unit="km"
          foot={<span className="text-text-muted">Last 4 weeks</span>}
        />
      </div>
    </div>
  );
}
