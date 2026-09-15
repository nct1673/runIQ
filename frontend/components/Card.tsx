import type { ReactNode } from "react";

import { ArrowUpRightIcon } from "@/components/icons";

interface CardProps {
  title?: string;
  href?: string; // if set, shows a "see more" arrow in the header
  className?: string;
  children: ReactNode;
}

/** Generic rounded dark panel used for every dashboard widget. */
export default function Card({ title, href, className = "", children }: CardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-muted">{title}</h3>
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

/** Empty placeholder for chart/content areas not built yet this phase. */
export function EmptyPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-text-muted">
      {label}
    </div>
  );
}
