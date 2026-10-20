import { type GaugeDef, pct } from "@/components/video-analysis/ranges";

export interface GaugePoint {
  value: number;
  color: string;
  label?: string; // letter shown inside the dot (stride number)
}

/** Horizontal range bar: green = typical band, dots = this video's values. */
export default function Gauge({ def, points }: { def: GaugeDef; points: GaugePoint[] }) {
  const [lo, hi] = def.typical;
  const left = pct(def, lo);
  return (
    <>
      <div className="relative h-2 rounded-full bg-surface-hover">
        <div className="absolute inset-y-0 rounded-full bg-positive/30" style={{ left: `${left}%`, width: `${pct(def, hi) - left}%` }} />
        {points.map((p, i) => (
          <span
            key={i}
            className="absolute -top-[5px] grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full border-2 border-surface text-[9px] font-bold text-[#14102a]"
            style={{ left: `${pct(def, p.value)}%`, background: p.color }}
          >
            {p.label}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-text-muted">
        {def.axisLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </>
  );
}
