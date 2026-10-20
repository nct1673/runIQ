import type { ReactNode } from "react";

/** Compact headline stat with a colored top edge (see frontend_design.html
 * `.kpi`): label row, big value, an optional visual, and a footer row. */
export default function KpiCard({
  accent,
  label,
  hint,
  value,
  unit,
  visual,
  footLeft,
  footRight,
}: {
  accent: string; // any CSS color, drawn as the card's top edge
  label: string;
  hint?: string;
  value: string;
  unit?: string;
  visual?: ReactNode;
  footLeft?: ReactNode;
  footRight?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col rounded-2xl border border-border bg-surface px-5 py-[18px]"
      style={{ boxShadow: `inset 0 3px 0 ${accent}, 0 8px 24px rgba(0,0,0,0.2)` }}
    >
      <div className="flex justify-between text-xs font-medium text-text-soft">
        <span>{label}</span>
        {hint && <span className="text-text-muted">{hint}</span>}
      </div>
      <div className="flex flex-1 flex-col justify-center py-3">
        <div className="text-[46px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
          {unit && <span className="ml-1.5 text-base font-medium text-text-muted">{unit}</span>}
        </div>
        {visual && <div className="mt-3">{visual}</div>}
      </div>
      <div className="flex items-end justify-between text-xs text-text-muted">
        <span>{footLeft}</span>
        <span>{footRight}</span>
      </div>
    </div>
  );
}

/** "+3.2 km" / "-12%" style change, green when good, orange when not. */
export function Delta({ value, text, goodWhenUp = true }: { value: number; text: string; goodWhenUp?: boolean }) {
  if (value === 0) return <span className="text-text-muted">{text}</span>;
  const good = goodWhenUp ? value > 0 : value < 0;
  return <span className={good ? "text-positive" : "text-negative"}>{text}</span>;
}
