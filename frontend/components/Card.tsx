import type { ReactNode } from "react";

import { ArrowUpRightIcon } from "@/components/icons";

interface CardProps {
  title?: string;
  href?: string; // if set, shows a "see more" arrow in the header
  info?: ReactNode; // if set, shows an "i" icon in the header that reveals this on hover/focus
  className?: string;
  children: ReactNode;
}

/** Generic rounded dark panel used for every dashboard widget. */
export default function Card({ title, href, info, className = "", children }: CardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-muted">{title}</h3>
          {info && <InfoTip>{info}</InfoTip>}
          {href && (
            <a
              href={href}
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <ArrowUpRightIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/** Small "i" icon; the popover opens on hover or keyboard focus (pure CSS). */
export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <div className="group relative ml-auto mr-1 flex items-center">
      <button
        type="button"
        aria-label="More info"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold italic leading-none text-text-muted hover:bg-surface-hover hover:text-text focus:bg-surface-hover focus:text-text focus:outline-none"
      >
        i
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-border bg-surface-hover p-3 text-[11px] font-normal not-italic leading-relaxed text-text opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {children}
      </div>
    </div>
  );
}

/** Empty placeholder for chart/content areas not built yet this phase. */
export function EmptyPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-text-muted">
      {label}
    </div>
  );
}
