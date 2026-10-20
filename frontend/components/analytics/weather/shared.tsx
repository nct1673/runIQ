import type { ReactNode } from "react";

import { CardTitle } from "@/components/Card";

/** Large card used by the four weather cards. */
export function WxCard({
  accent,
  title,
  right,
  className = "",
  children,
}: {
  accent: string;
  title: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${className}`}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <CardTitle accent={accent}>{title}</CardTitle>
        {right && <div className="text-xs text-text-muted">{right}</div>}
      </div>
      {children}
    </div>
  );
}

/** Big number + short explanation, the header of the heat cards. */
export function BigStat({ value, unit, color, children }: { value: string; unit?: string; color: string; children: ReactNode }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-[18px]">
      <div className="flex flex-none items-baseline gap-1.5">
        <b className="text-[44px] font-semibold leading-none tracking-[-0.03em]" style={{ color }}>
          {value}
        </b>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      <p className="min-w-[200px] flex-1 border-l border-border pl-[18px] text-[13px] leading-normal text-text-soft [&_b]:font-semibold [&_b]:text-text">
        {children}
      </p>
    </div>
  );
}

/** Shows how much to trust an estimate. */
export function ConfidenceNote({ level, children }: { level: "low" | "moderate" | "high" | "ok"; children: ReactNode }) {
  const low = level === "low";
  const label = low ? "Low confidence" : level === "moderate" ? "Moderate confidence" : "Reliable";
  return (
    <div
      className={
        "mt-2 flex items-start gap-2.5 rounded-[10px] border px-3 py-2 text-xs leading-relaxed text-text-muted " +
        (low ? "border-dashed border-amber/40" : "border-border")
      }
    >
      <span
        className="mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{
          color: low ? "var(--color-amber)" : "var(--color-positive)",
          background: low ? "rgb(255 185 56 / 0.14)" : "rgb(182 243 90 / 0.12)",
        }}
      >
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

/** Pill-style segmented control (the design's "seg2"). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[9px] border border-border bg-surface-hover p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          disabled={o.disabled}
          aria-pressed={value === o.key}
          title={o.disabled ? "Data unavailable" : undefined}
          onClick={() => onChange(o.key)}
          className={
            "rounded-[7px] px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
            (value === o.key ? "bg-white/10 font-semibold text-text" : "text-text-muted hover:text-text-soft")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LegendDot({ color, hollow = false, children }: { color: string; hollow?: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="10" height="10" aria-hidden>
        <circle cx="5" cy="5" r="4" fill={hollow ? "none" : color} stroke={hollow ? color : "none"} strokeWidth="1.5" opacity={hollow ? 1 : 0.6} />
      </svg>
      {children}
    </span>
  );
}

export function LegendLine({ color, faded = false, children }: { color: string; faded?: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className="inline-block h-[3px] w-3.5 rounded-sm" style={{ background: color, opacity: faded ? 0.35 : 1 }} />
      {children}
    </span>
  );
}

export function Unavailable({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 rounded-[10px] border border-dashed border-border-strong px-3 py-4 text-sm text-text-muted">
      <span className="font-semibold text-text-soft">Data unavailable</span> &mdash; {children}
    </div>
  );
}
