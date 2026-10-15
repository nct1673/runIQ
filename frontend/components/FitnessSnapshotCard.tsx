import { Delta } from "@/components/KpiCard";
import { formatPace } from "@/lib/format";

function Mini({ label, value, unit, foot }: { label: string; value: string; unit?: string; foot: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-hover px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-wider text-text-soft">{label}</div>
      <div className="mb-0.5 mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-text-muted">{unit}</span>}
      </div>
      <div className="text-xs">{foot}</div>
    </div>
  );
}

/** Secondary fitness numbers, deliberately small -- context for the hero
 * card, not a chart in their own right. */
export default function FitnessSnapshotCard({
  vo2Max,
  vo2DeltaPct,
  avgPaceSPerKm,
  paceDeltaS,
  avgWeeklyKm,
}: {
  vo2Max: number | null | undefined;
  vo2DeltaPct: number | null | undefined;
  avgPaceSPerKm: number | null;
  paceDeltaS: number | null; // latest 5 vs the 5 before; negative = faster
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
      <div className="grid flex-1 grid-cols-1 content-start gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <Mini
          label="VO2 Max"
          value={vo2Max != null ? vo2Max.toFixed(1) : "--"}
          foot={
            vo2DeltaPct != null && Number.isFinite(vo2DeltaPct) ? (
              <Delta value={vo2DeltaPct} text={`${vo2DeltaPct > 0 ? "↑" : vo2DeltaPct < 0 ? "↓" : ""} ${Math.abs(vo2DeltaPct).toFixed(1)}% vs 7d`} />
            ) : (
              <span className="text-text-muted">--</span>
            )
          }
        />
        <Mini
          label="Avg pace"
          value={avgPaceSPerKm != null ? formatPace(avgPaceSPerKm).replace("/km", "") : "--"}
          unit={avgPaceSPerKm != null ? "/km" : undefined}
          foot={
            paceDeltaS != null && Math.abs(paceDeltaS) >= 1 ? (
              <Delta
                value={paceDeltaS}
                goodWhenUp={false}
                text={`${paceDeltaS < 0 ? "↑" : "↓"} ${Math.round(Math.abs(paceDeltaS))}s ${paceDeltaS < 0 ? "faster" : "slower"}`}
              />
            ) : (
              <span className="text-text-muted">Last 5 runs</span>
            )
          }
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
