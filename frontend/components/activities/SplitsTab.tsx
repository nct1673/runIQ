import { formatDuration, paceParts } from "@/lib/activities";

import { DataUnavailable } from "./shared";

/** One kilometre of a run. Nothing in the database stores these yet (only
 * per-run summaries are imported), so `splits` is null for now. To fill the
 * tab, import Garmin's per-lap/per-km data into a table, expose it on
 * GET /api/activities/{id}, and pass it in here -- the table below renders
 * as soon as an array is given. */
export interface Split {
  km: number;
  paceSPerKm: number;
  avgHr: number | null;
  cadence: number | null;
  elevationM: number | null;
}

export default function SplitsTab({ splits }: { splits: Split[] | null }) {
  if (!splits || splits.length === 0) {
    return (
      <div className="px-6 pb-6 pt-[22px]">
        <DataUnavailable>per-kilometre splits haven&apos;t been imported for this run yet.</DataUnavailable>
      </div>
    );
  }

  const paces = splits.map((s) => s.paceSPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);

  return (
    <div className="overflow-x-auto px-6 pb-6 pt-[22px]">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted">
            <th className="pb-2 font-semibold">Km</th>
            <th className="pb-2 font-semibold">Pace</th>
            <th className="w-1/3 pb-2" />
            <th className="pb-2 text-right font-semibold">HR</th>
            <th className="pb-2 text-right font-semibold">Cadence</th>
            <th className="pb-2 text-right font-semibold">Elev</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((s) => {
            const width = slowest === fastest ? 100 : 40 + ((slowest - s.paceSPerKm) / (slowest - fastest)) * 60;
            const p = paceParts(s.paceSPerKm);
            return (
              <tr key={s.km} className="border-t border-border">
                <td className="py-2 text-text-soft">{s.km}</td>
                <td className="py-2 font-semibold tabular-nums">
                  {p.value}
                  <span className="text-xs font-normal text-text-muted">{p.unit}</span>
                </td>
                <td className="py-2 pr-3">
                  <span className="block h-1.5 rounded-full bg-white/5">
                    <i
                      className="block h-full rounded-full"
                      style={{ width: `${width}%`, background: s.paceSPerKm === fastest ? "var(--color-positive)" : "#4a4486" }}
                    />
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{s.avgHr != null ? Math.round(s.avgHr) : "--"}</td>
                <td className="py-2 text-right tabular-nums">{s.cadence != null ? Math.round(s.cadence) : "--"}</td>
                <td className="py-2 text-right tabular-nums">{s.elevationM != null ? `${Math.round(s.elevationM)} m` : "--"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-text-muted">
        Total {formatDuration(splits.reduce((s, x) => s + x.paceSPerKm, 0))} over {splits.length} km.
      </p>
    </div>
  );
}
