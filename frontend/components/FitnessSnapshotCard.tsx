import { formatPace } from "@/lib/format";

function Mini({ label, value, unit, foot }: { label: string; value: string; unit?: string; foot?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-hover px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-text-soft">{label}</div>
        {foot && <div className="mt-1 text-xs">{foot}</div>}
      </div>
      <div className="shrink-0 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span>}
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
}: {
  vo2Max: number | null | undefined;
  easyPaceSPerKm: number | null; // mean pace of easy runs, last 2 months
  easyRunCount: number;
  avgWeeklyKm: number | null;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-amber" />
          Fitness snapshot
        </div>
        <span className="text-xs text-text-muted">Recent form</span>
      </div>
      <div className="grid flex-1 grid-cols-1 content-start gap-2.5">
        <Mini
          label="VO2 Max"
          value={vo2Max != null ? vo2Max.toFixed(1) : "--"}
        />
        <Mini
          label="Easy run pace"
          value={easyPaceSPerKm != null ? formatPace(easyPaceSPerKm).replace("/km", "") : "--"}
          unit={easyPaceSPerKm != null ? "/km" : undefined}
          foot={<span className="text-text-muted">Last 2 months{easyRunCount ? ` · ${easyRunCount} runs` : ""}</span>}
        />
        <Mini
          label="Weekly avg"
          value={avgWeeklyKm != null ? avgWeeklyKm.toFixed(1) : "--"}
          unit="km"
          foot={<span className="text-text-muted">Last 4 weeks</span>}
        />
      </div>
    </div>
  );
}
