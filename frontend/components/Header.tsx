import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string; // small uppercase line above the title (e.g. today's date)
  children?: ReactNode; // right-side controls
}

/** Shared page header: big title on the left, controls slot on the right. */
export default function Header({ title, subtitle, eyebrow, children }: HeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{eyebrow}</div>}
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

/** Small rounded icon button used in header control clusters (bell, menu, ...). */
export function HeaderIconButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-muted hover:text-text"
    >
      {children}
    </button>
  );
}
