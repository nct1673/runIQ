import type { ComponentType } from "react";

interface StatCardProps {
  icon: ComponentType<{ className?: string }>;
  colorClassName: string; // bg-* token for the icon badge
  label: string;
  value?: string; // "--" (default) while loading/unavailable -- see label comment below
}

/**
 * One of the four top summary stats. `value` comes from
 * GET /api/analytics/summary (app/services/analytics_service.py) --
 * still "--" for cards that endpoint doesn't cover yet (e.g. Total
 * Energy: Activity has no calories column, so there's nothing to show
 * until normalizer.normalize_one maps api_calories across). Delta
 * (period-over-period change) isn't wired yet either -- that needs
 * get_trends, still a stub.
 */
export default function StatCard({ icon: Icon, colorClassName, label, value = "--" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colorClassName}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-2xl font-semibold text-text">{value}</div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-muted">--</span>
      </div>
    </div>
  );
}
