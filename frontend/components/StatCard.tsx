import type { ComponentType } from "react";

import { TrendDownIcon, TrendUpIcon } from "@/components/icons";

interface StatCardProps {
  icon: ComponentType<{ className?: string }>;
  colorClassName: string; // bg-* token for the icon badge
  label: string;
  value?: string; // "--" (default) while loading/unavailable -- see label comment below
  deltaPct?: number | null; // week-over-week change, e.g. 12.5 == +12.5%. undefined/null hides the row.
  deltaLabel?: string; // what the delta compares, e.g. "vs last week"
}

/**
 * One of the four top summary stats. `value` comes from
 * GET /api/analytics/summary (app/services/analytics_service.py) --
 * still "--" for cards that endpoint doesn't cover yet (e.g. Total
 * Energy: Activity has no calories column, so there's nothing to show
 * until normalizer.normalize_one maps api_calories across).
 */
export default function StatCard({
  icon: Icon,
  colorClassName,
  label,
  value = "--",
  deltaPct,
  deltaLabel = "vs last week",
}: StatCardProps) {
  const hasDelta = deltaPct != null && Number.isFinite(deltaPct);
  const isPositive = hasDelta && deltaPct! >= 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colorClassName}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-2xl font-semibold text-text">{value}</div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        {hasDelta ? (
          <span
            className={
              "flex items-center gap-1 text-xs font-medium " +
              (isPositive ? "text-positive" : "text-negative")
            }
            title={deltaLabel}
          >
            {isPositive ? <TrendUpIcon className="h-3.5 w-3.5" /> : <TrendDownIcon className="h-3.5 w-3.5" />}
            {isPositive ? "+" : ""}
            {deltaPct!.toFixed(0)}%
          </span>
        ) : (
          <span className="text-text-muted">--</span>
        )}
      </div>
    </div>
  );
}
