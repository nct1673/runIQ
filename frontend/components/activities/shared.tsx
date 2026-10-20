import type { ReactNode } from "react";

import { CloudIcon, RainIcon, SunIcon } from "@/components/icons";
import { ZONES } from "@/lib/activities";

/** Dashed box shown wherever the database has nothing for a section. */
export function DataUnavailable({ children }: { children?: ReactNode }) {
  return (
    <div className="mt-1 rounded-[10px] border border-dashed border-border-strong px-3 py-2.5 text-xs text-text-muted">
      <span className="font-semibold text-text-soft">Data unavailable</span>
      {children && <> &mdash; {children}</>}
    </div>
  );
}

/** A caution about data that exists but looks unreliable (not missing). */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-[10px] border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-text-muted">
      <span aria-hidden>⚠ </span>
      {children}
    </div>
  );
}

/** Inner panel of the detail view: colored-dot title, optional right-aligned note. */
export function SubPanel({
  title,
  accent,
  right,
  className = "",
  children,
}: {
  title: string;
  accent: string;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[14px] border border-border bg-surface-hover p-[18px] ${className}`}>
      <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold">
        <i className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        {title}
        {right && <span className="ml-auto text-[11.5px] font-medium text-text-muted">{right}</span>}
      </h3>
      {children}
    </div>
  );
}

/** Sun / cloud / rain glyph for an OpenWeather `main` condition. */
export function WeatherGlyph({ condition, className }: { condition: string | null; className?: string }) {
  const key = (condition ?? "").toLowerCase();
  if (key === "clear") return <SunIcon className={className} />;
  if (key === "rain" || key === "drizzle" || key === "thunderstorm") return <RainIcon className={className} />;
  return <CloudIcon className={className} />;
}

/** Thin stacked bar of time in each HR zone (the strip under every run row). */
export function ZoneStrip({ seconds, className = "" }: { seconds: number[]; className?: string }) {
  const total = seconds.reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  return (
    <div className={`flex h-1 gap-px overflow-hidden rounded-full ${className}`} aria-hidden>
      {seconds.map((s, i) =>
        s > 0 ? <i key={i} style={{ width: `${(s / total) * 100}%`, background: ZONES[i].color }} /> : null,
      )}
    </div>
  );
}

/** A control the design shows but nothing backs yet: rendered, disabled, with a tooltip. */
export function UnavailableButton({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      aria-label={`${label} (data unavailable)`}
      title="Data unavailable"
      className={`cursor-not-allowed opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Big number with a small unit, used by the stat tiles. */
export function ValueUnit({ value, unit }: { value: string; unit?: string }) {
  return (
    <>
      {value}
      {unit && <em className="ml-[3px] text-[0.5em] font-medium not-italic text-text-muted">{unit}</em>}
    </>
  );
}
