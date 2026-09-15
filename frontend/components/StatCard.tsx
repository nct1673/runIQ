import type { ComponentType } from "react";

interface StatCardProps {
  icon: ComponentType<{ className?: string }>;
  colorClassName: string; // bg-* token for the icon badge
  label: string;
}

/**
 * One of the four top summary stats. Value/delta are left as "--"
 * placeholders -- this phase builds the shell, not the analytics wiring
 * (that's app/services/analytics_service.py, still a stub).
 */
export default function StatCard({ icon: Icon, colorClassName, label }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colorClassName}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-2xl font-semibold text-text">--</div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-muted">--</span>
      </div>
    </div>
  );
}
