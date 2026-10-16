import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, DotsIcon, PinIcon, SparklesIcon } from "@/components/icons";
import {
  dominantZone,
  formatClock,
  formatDuration,
  formatLongDate,
  hrZoneSeconds,
  paceDiffVsPrevious,
  paceParts,
  runTitle,
  trainingBadge,
  typeLabel,
  type Activity,
  type DetailState,
} from "@/lib/activities";

import OverviewTab from "./OverviewTab";
import { UnavailableButton } from "./shared";

function HeroStat({
  label,
  big = false,
  value,
  unit,
  children,
}: {
  label: string;
  big?: boolean;
  value: string;
  unit?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-[18px] @3xl:border-l @3xl:border-border @3xl:pl-[22px] @3xl:first:border-l-0 @3xl:first:pl-0">
      <small className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">{label}</small>
      <b
        className={
          "mt-1.5 block font-semibold tabular-nums " + (big ? "text-[46px] leading-none tracking-[-0.03em]" : "text-[26px] tracking-tight")
        }
      >
        {value}
        {unit && <em className="ml-[3px] text-[13px] font-medium not-italic text-text-muted">{unit}</em>}
      </b>
      <div className="mt-1 text-xs text-text-muted">{children}</div>
    </div>
  );
}

export default function RunDetail({
  activity: a,
  detail,
  all,
  onPrev,
  onNext,
}: {
  activity: Activity;
  detail: DetailState;
  all: Activity[];
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const full = typeof detail === "object" ? detail : null;
  const badge = trainingBadge(a.training_effect_label);
  const pace = paceParts(a.avg_pace_s_per_km);
  const vs = paceDiffVsPrevious(a, all);
  const topZone = dominantZone(hrZoneSeconds(a));
  const moving = a.moving_duration_s ?? a.duration_s;

  return (
    <div className="@container overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="px-6 pt-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[22px] font-semibold tracking-[-0.01em]">{runTitle(a)}</h2>
            <div className="mt-[5px] flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-text-soft">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-text-muted" strokeWidth={2} />
                {formatLongDate(a.started_at)} · {formatClock(a.started_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <PinIcon className="h-3.5 w-3.5 text-text-muted" strokeWidth={2} />
                {a.location && a.location.toLowerCase() !== typeLabel(a).toLowerCase() ? `${a.location} · ` : ""}
                {typeLabel(a)}
              </span>
              {badge && (
                <span
                  className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ color: badge.color, background: `color-mix(in srgb, ${badge.color} 12%, transparent)` }}
                >
                  {badge.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <UnavailableButton
              label="Ask AI coach"
              className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-white"
            >
              <SparklesIcon className="h-4 w-4" />
            </UnavailableButton>
            <button
              type="button"
              onClick={onPrev ?? undefined}
              disabled={!onPrev}
              aria-label="Previous run"
              title="Previous run"
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-border bg-surface-hover text-text-soft hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={onNext ?? undefined}
              disabled={!onNext}
              aria-label="Next run"
              title="Next run"
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-border bg-surface-hover text-text-soft hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <UnavailableButton
              label="More actions"
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-border bg-surface-hover text-text-soft"
            >
              <DotsIcon className="h-4 w-4" />
            </UnavailableButton>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 border-y border-border @lg:grid-cols-3 @3xl:grid-cols-[1.25fr_repeat(4,1fr)] @3xl:gap-x-0">
          <HeroStat label="Distance" big value={a.distance_km.toFixed(2)} unit="km">
            {a.elevation_gain_m != null ? `${Math.round(a.elevation_gain_m)} m elevation gain` : "Elevation unavailable"}
          </HeroStat>
          <HeroStat label="Pace" value={pace.value} unit={pace.unit}>
            {vs == null ? (
              "No earlier runs to compare"
            ) : Math.abs(vs.diff) < 2 ? (
              `In line with last ${vs.n}`
            ) : (
              <span style={{ color: vs.diff < 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                {vs.diff < 0 ? "↑" : "↓"} {Math.round(Math.abs(vs.diff))}s vs last {vs.n}
              </span>
            )}
          </HeroStat>
          <HeroStat label="Moving time" value={formatDuration(moving)}>
            {full?.elapsed_duration_s != null ? `${formatDuration(full.elapsed_duration_s)} elapsed` : full ? "" : " "}
          </HeroStat>
          <HeroStat label="Avg HR" value={a.avg_hr != null ? String(Math.round(a.avg_hr)) : "--"} unit={a.avg_hr != null ? "bpm" : undefined}>
            {topZone ? (topZone.share >= 0.5 ? `Mostly Zone ${topZone.zone}` : `Mixed · Zone ${topZone.zone} most`) : "No zone data"}
          </HeroStat>
          <HeroStat
            label="Calories"
            value={full?.calories != null ? String(Math.round(full.calories)) : "--"}
            unit={full?.calories != null ? "kcal" : undefined}
          >
            {a.vo2_max != null ? `VO₂ max ${Math.round(a.vo2_max)}` : "VO₂ max unavailable"}
          </HeroStat>
        </div>
      </div>

      <OverviewTab activity={a} detail={detail} all={all} />
    </div>
  );
}
