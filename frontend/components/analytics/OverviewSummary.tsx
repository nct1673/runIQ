"use client";

import type { TabId } from "@/components/analytics/AnalyticsTabs";
import type { RunRow } from "@/components/analytics/PersonalRecordsGrid";
import { agoLabel, bestVdot, LONGEST_RUN_TYPE_ID, RACE_DISTANCES, type PersonalRecord } from "@/components/analytics/records";
import { formatDuration, formatPace } from "@/lib/format";
import { signed, startTimeSummary, windowLabel, type WeatherImpact } from "@/lib/weather";

/** Overview tab extras (design: runIQ_draft/analytics_design2.html): the three
 * "see all" summary cards that lead into the Records / Form / Conditions tabs,
 * and the year-to-date "at a glance" card. All derived from data the page
 * already loads. */

const CARD = "flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]";

function SummaryCard({
  label,
  to,
  onNavigate,
  value,
  unit,
  color,
  children,
}: {
  label: string;
  to: TabId;
  onNavigate: (tab: TabId) => void;
  value: string;
  unit?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.07em] text-text-muted">
        {label}
        <a
          href={`#${to}`}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(to);
          }}
          className="text-[12.5px] font-normal normal-case tracking-normal text-blue"
        >
          See all →
        </a>
      </div>
      <div className="text-3xl font-semibold tracking-[-0.02em]" style={color ? { color } : undefined}>
        {value}
        {unit && <em className="ml-1 text-sm font-medium not-italic text-text-muted">{unit}</em>}
      </div>
      <p className="text-[13px] leading-normal text-text-soft">{children}</p>
    </div>
  );
}

export function SummaryCards({
  records,
  form,
  weather,
  onNavigate,
}: {
  records: PersonalRecord[] | null;
  form: { improving: number; total: number; worsening: string[] } | null;
  weather: WeatherImpact | null;
  onNavigate: (tab: TabId) => void;
}) {
  // Records: the most recently set PR.
  const newest = records
    ?.filter((r) => r.achieved_at)
    .sort((a, b) => new Date(b.achieved_at as string).getTime() - new Date(a.achieved_at as string).getTime())[0];
  const newestLabel =
    newest && (newest.type_id === LONGEST_RUN_TYPE_ID ? "Longest run" : RACE_DISTANCES.find((d) => d.typeId === newest.type_id)?.label);
  const newestValue = newest
    ? newest.metric === "time_s"
      ? formatDuration(newest.value)
      : `${(newest.value / 1000).toFixed(2)} km`
    : "--";
  const strongest = bestVdot(records);

  // Conditions
  const model = weather?.model ?? null;
  const windows = weather ? startTimeSummary(weather) : null;

  return (
    <section className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-3">
      <SummaryCard label="Records" to="records" onNavigate={onNavigate} value={newestValue} unit={newestLabel || undefined}>
        {newest ? (
          <>
            Newest PR, <b className="text-text">{agoLabel(newest.achieved_at)}</b>. {records?.length} records in total
            {strongest ? `; the ${strongest.label} is your strongest.` : "."}
          </>
        ) : (
          "No personal records synced yet."
        )}
      </SummaryCard>

      <SummaryCard
        label="Form"
        to="form"
        onNavigate={onNavigate}
        value={form && form.total ? `${form.improving}/${form.total}` : "--"}
        unit="improving"
        color={form && form.total && form.worsening.length === 0 ? "var(--color-positive)" : undefined}
      >
        {!form || !form.total ? (
          "Not enough runs in this range yet."
        ) : form.worsening.length === 0 ? (
          "Every tracked form metric is trending the right way."
        ) : (
          <>
            Watch <b className="text-amber">{form.worsening.join(", ").toLowerCase()}</b>: trending the wrong way over this range.
          </>
        )}
      </SummaryCard>

      <SummaryCard
        label="Conditions"
        to="conditions"
        onNavigate={onNavigate}
        value={model ? signed(model.heat_s_per_km_per_c) : "--"}
        unit="s/km per °C"
        color={model && model.heat_s_per_km_per_c > 0 ? "var(--color-amber)" : undefined}
      >
        {!weather ? (
          "Loading…"
        ) : !model ? (
          "Not enough easy outdoor runs with heart-rate data yet."
        ) : windows?.fastest && windows.diff != null && windows.fastest.start !== windows.usual.start ? (
          <>
            Heat cost at the same effort. Your fastest window is{" "}
            <b className="text-blue">{windowLabel(windows.fastest.start, windows.fastest.end)}</b>,{" "}
            {Math.round(windows.diff)} s/km quicker than your usual {windowLabel(windows.usual.start, windows.usual.end)}.
          </>
        ) : (
          "Heat cost per +1°C feels-like, at the same effort."
        )}
      </SummaryCard>
    </section>
  );
}

/** "<year> at a glance": year-to-date totals from the synced runs. */
export function GlanceCard({ runs }: { runs: RunRow[] | null }) {
  const year = new Date().getFullYear();
  const ytd = runs?.filter((r) => new Date(r.started_at).getFullYear() === year) ?? [];
  const km = ytd.reduce((s, r) => s + r.distance_km, 0);
  const seconds = ytd.reduce((s, r) => s + (r.duration_s ?? 0), 0);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  const firstMonth = ytd.length
    ? new Date(Math.min(...ytd.map((r) => new Date(r.started_at).getTime()))).toLocaleDateString(undefined, { month: "short" })
    : "Jan";
  const nowMonth = new Date().toLocaleDateString(undefined, { month: "short" });

  const stat = (label: string, value: React.ReactNode) => (
    <div>
      <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">{label}</small>
      <b className="mt-1 block text-[26px] font-semibold">{value}</b>
    </div>
  );
  const unit = (u: string) => <em className="ml-[3px] text-[13px] font-medium not-italic text-text-muted">{u}</em>;

  return (
    <div className="rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <i className="inline-block h-2 w-2 rounded-full bg-blue" />
          {year} at a glance
        </div>
        <span className="text-xs text-text-muted">
          {firstMonth} – {nowMonth}
        </span>
      </div>
      {!runs ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-4">
          {stat("Distance", <>{km.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit("km")}</>)}
          {stat("Runs", ytd.length)}
          {stat("Time", <>{hours}{unit("h")} {mins}{unit("m")}</>)}
          {stat("Avg pace", km > 0 ? <>{formatPace(seconds / km).replace("/km", "")}{unit("/km")}</> : "--")}
        </div>
      )}
    </div>
  );
}
