"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Sticky tab bar for /analytics (design: runIQ_draft/analytics_design2.html).
 * The active tab lives in the URL hash (#overview, #records, ...) so a tab
 * can be linked to and the back button works; no page reload. */

export type TabId = "overview" | "records" | "form" | "conditions";

export const TAB_IDS: TabId[] = ["overview", "records", "form", "conditions"];

/** Active tab from the URL hash; "overview" on the server and for unknown hashes. */
export function useTabFromHash(): [TabId, (id: TabId) => void] {
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as TabId;
      setTab(TAB_IDS.includes(h) ? h : "overview");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return [
    tab,
    (id) => {
      window.location.hash = id; // fires hashchange -> setTab
    },
  ];
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4 w-4",
} as const;

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "records",
    label: "Records",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" />
      </svg>
    ),
  },
  {
    id: "form",
    label: "Form",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="13" cy="4" r="2" />
        <path d="M7 21l3-6 3 2 1 4M10 15l1-6 4 2 3 3M11 9l-4 2-2 3" />
      </svg>
    ),
  },
  {
    id: "conditions",
    label: "Conditions",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
];

export default function AnalyticsTabs({
  active,
  onSelect,
  badges,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  /** Small pill after a tab label; `tone: "good"` is the green one. */
  badges: Partial<Record<TabId, { text: string; tone?: "good" } | null>>;
}) {
  return (
    <nav
      aria-label="Analytics sections"
      className="sticky top-0 z-[5] -mx-6 mb-6 flex items-center gap-1 border-b border-border bg-bg/90 px-6 backdrop-blur-[8px] lg:-mx-8 lg:px-8"
    >
      {TABS.map((t) => {
        const on = t.id === active;
        const badge = badges[t.id];
        return (
          <a
            key={t.id}
            href={`#${t.id}`}
            aria-current={on ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onSelect(t.id);
            }}
            className={
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm " +
              (on ? "border-brand font-semibold text-text" : "border-transparent font-medium text-text-muted hover:text-text-soft")
            }
          >
            {t.icon}
            {t.label}
            {badge && (
              <span
                className={
                  "rounded-full px-[7px] py-0.5 text-[11px] font-bold " +
                  (badge.tone === "good"
                    ? "bg-positive/15 text-positive"
                    : on
                      ? "bg-brand/15 text-[#ff8fb8]"
                      : "bg-surface-hover text-text-muted")
                }
              >
                {badge.text}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
