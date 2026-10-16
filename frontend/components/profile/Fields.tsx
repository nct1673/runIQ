"use client";

import type { ReactNode } from "react";

/** Form building blocks for /profile (design: runIQ_draft/profile_design.html). */

export const CARD = "scroll-mt-5 rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]";

const FIELD_BOX =
  "flex h-11 items-center gap-2.5 rounded-[11px] border bg-bg px-3.5 text-sm text-text transition-colors focus-within:border-violet focus-within:shadow-[0_0_0_3px_rgba(162,123,255,0.2)]";
const FIELD_BORDER = "border-border-strong";
const FIELD_DIRTY = "!border-amber shadow-[0_0_0_3px_rgba(255,185,56,0.12)]";

export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {children && <p className="mt-1 max-w-[520px] text-[12.5px] leading-normal text-text-muted">{children}</p>}
    </div>
  );
}

/** Label (+ amber "edited" tag when changed), the control, and optional help text. */
export function Field({
  label,
  htmlFor,
  edited,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  edited?: boolean;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex justify-between text-[12.5px] font-semibold text-text-soft">
        {label}
        {edited && <em className="font-normal not-italic text-text-muted">edited</em>}
      </label>
      {children}
      {help && <div className="mt-[7px] flex items-center gap-1.5 text-xs text-text-muted">{help}</div>}
    </div>
  );
}

/** Text/number/date input with an optional right-hand unit or note. */
export function Input({
  id,
  value,
  onChange,
  type = "text",
  step,
  unit,
  placeholder,
  dirty,
  list,
  right,
  autoComplete,
}: {
  id: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  unit?: string;
  placeholder?: string;
  dirty?: boolean;
  list?: string;
  right?: ReactNode;
  autoComplete?: string;
}) {
  return (
    <div className={`${FIELD_BOX} ${dirty ? FIELD_DIRTY : FIELD_BORDER}`}>
      <input
        id={id}
        type={type}
        step={step}
        list={list}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent outline-none [color-scheme:dark] placeholder:text-text-muted"
      />
      {unit && <span className="text-[12.5px] text-text-muted">{unit}</span>}
      {right}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  dirty,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  dirty?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex h-11 rounded-[11px] border bg-bg p-[3px] ${dirty ? FIELD_DIRTY : FIELD_BORDER}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={
              "grid flex-1 place-items-center rounded-lg text-[13px] " +
              (on ? "bg-surface-hover font-semibold text-text shadow-[inset_0_0_0_1px_var(--color-border-strong)]" : "text-text-muted hover:text-text-soft")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const btnClass =
  "inline-flex h-[42px] items-center gap-2 rounded-[11px] border border-border-strong px-[18px] text-[13.5px] font-medium text-text-soft hover:text-text disabled:cursor-not-allowed disabled:opacity-45";
export const btnPrimaryClass =
  "inline-flex h-[42px] items-center rounded-[11px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] px-[18px] text-[13.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45";
