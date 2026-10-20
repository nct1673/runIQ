import { ChevronDownIcon, PinIcon, TreadmillIcon, TrophyIcon } from "@/components/icons";
import {
  ZONES,
  formatClock,
  hrZoneSeconds,
  isTreadmill,
  paceParts,
  runTags,
  runTitle,
  typeLabel,
  type Activity,
  type MonthGroup,
} from "@/lib/activities";

import { WeatherGlyph, ZoneStrip } from "./shared";

function MonthHeader({
  group,
  maxKm,
  open,
  onToggle,
}: {
  group: MonthGroup;
  maxKm: number;
  open: boolean;
  onToggle: () => void;
}) {
  const pace = paceParts(group.avgPace);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-hover " +
        (open ? "bg-surface-hover" : "")
      }
    >
      <span className="grid h-[22px] w-[22px] shrink-0 place-items-center text-text-muted">
        <ChevronDownIcon className={"h-3.5 w-3.5 transition-transform " + (open ? "" : "-rotate-90")} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 shrink-0 text-sm font-semibold sm:w-[118px]">{group.label}</span>
      <span className="relative hidden h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover sm:block">
        <i
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${(group.km / maxKm) * 100}%`,
            background: open ? "linear-gradient(90deg, #a27bff, #ff4d8d)" : "#4a4486",
          }}
        />
      </span>
      <span className="ml-auto flex shrink-0 flex-wrap justify-end gap-x-3.5 text-xs text-text-muted sm:ml-0 sm:w-[210px] sm:flex-nowrap">
        <span>
          <b className="font-semibold text-text">{group.runs}</b> runs
        </span>
        <span>
          <b className="font-semibold text-text">{group.km.toFixed(1)}</b> km
        </span>
        <span className="hidden min-[480px]:inline">
          {pace.value}
          {pace.unit}
        </span>
      </span>
    </button>
  );
}

function RunRow({
  activity: a,
  selected,
  onSelect,
  tags,
}: {
  activity: Activity;
  selected: boolean;
  onSelect: () => void;
  tags: ReturnType<typeof runTags>;
}) {
  const d = new Date(a.started_at);
  const pace = paceParts(a.avg_pace_s_per_km);
  const special = tags.pr || tags.longest || tags.race;
  const MetaIcon = isTreadmill(a) ? TreadmillIcon : PinIcon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={
        "relative my-1 ml-[18px] grid w-[calc(100%-18px)] grid-cols-[48px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[48px_minmax(0,1fr)_auto] rounded-xl border p-3 text-left transition-colors before:absolute before:inset-y-0 before:-left-[9px] before:border-l before:border-border " +
        (selected
          ? "border-violet/50 bg-violet/10"
          : "border-transparent hover:bg-surface-hover")
      }
    >
      <div
        className={
          "flex h-[50px] w-12 flex-col items-center justify-center rounded-[10px] border " +
          (selected
            ? "border-violet bg-violet"
            : special
              ? "border-amber/50 bg-surface-hover"
              : "border-border bg-surface-hover")
        }
      >
        <small className={"text-[10px] font-semibold uppercase " + (selected ? "text-[#ede6ff]" : "text-text-muted")}>
          {d.toLocaleDateString(undefined, { weekday: "short" })}
        </small>
        <b className="text-lg font-semibold leading-[1.1]">{d.getDate()}</b>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="truncate">{runTitle(a)}</span>
          {tags.pr && (
            <Tag color="var(--color-amber)">
              <TrophyIcon className="h-3 w-3" strokeWidth={2.2} />
              PR
            </Tag>
          )}
          {tags.longest && <Tag color="var(--color-blue)">Longest</Tag>}
          {tags.race && <Tag color="var(--color-brand)">Race</Tag>}
        </div>
        <div className="mt-[3px] flex items-center gap-1.5 text-xs text-text-muted">
          <MetaIcon className="h-[13px] w-[13px] shrink-0" strokeWidth={2} />
          <span className="truncate">
            {typeLabel(a)} · {formatClock(a.started_at)}
          </span>
          {a.temperature_c != null && (
            <span className="flex shrink-0 items-center gap-1">
              · <WeatherGlyph condition={a.weather_condition} className="h-[13px] w-[13px]" />
              {Math.round(a.temperature_c)}°C
            </span>
          )}
        </div>
        <ZoneStrip seconds={hrZoneSeconds(a)} className="mt-2 max-w-[200px]" />
      </div>

      <div className="col-span-2 flex items-baseline justify-between gap-3 sm:col-span-1 sm:block sm:text-right">
        <b className="text-[22px] font-semibold tracking-tight tabular-nums">
          {a.distance_km.toFixed(2)}
          <em className="ml-0.5 text-xs font-medium not-italic text-text-muted">km</em>
        </b>
        <div className="mt-0.5 whitespace-nowrap text-xs text-text-muted">
          <span className="text-text-soft">{pace.value}</span>
          {pace.unit}
          {a.avg_hr != null && (
            <>
              {" · "}
              <span className="text-text-soft">{Math.round(a.avg_hr)}</span> bpm
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-md px-[7px] py-0.5 text-[10.5px] font-bold"
      style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      {children}
    </span>
  );
}

export default function RunList({
  groups,
  maxMonthKm,
  openMonths,
  onToggleMonth,
  selectedId,
  onSelect,
  raceIds,
  prevYear,
  nextYear,
  onYear,
}: {
  groups: MonthGroup[];
  maxMonthKm: number;
  openMonths: Set<string>;
  onToggleMonth: (key: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  raceIds: Set<string>;
  prevYear: number | null;
  nextYear: number | null;
  onYear: (year: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-2 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      {groups.map((group) => {
        const open = openMonths.has(group.key);
        return (
          <div key={group.key}>
            <MonthHeader group={group} maxKm={maxMonthKm} open={open} onToggle={() => onToggleMonth(group.key)} />
            {open &&
              group.activities.map((a) => (
                <RunRow
                  key={a.id}
                  activity={a}
                  selected={a.id === selectedId}
                  onSelect={() => onSelect(a.id)}
                  tags={runTags(a, raceIds)}
                />
              ))}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1.5 pt-3 text-xs text-text-muted">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          Zone bar under each run:
          {ZONES.map((z) => (
            <span key={z.zone} className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: z.color }} />Z{z.zone}
            </span>
          ))}
        </span>
        <span className="flex gap-3">
          {nextYear != null && (
            <button type="button" className="hover:text-text" onClick={() => onYear(nextYear)}>
              ‹ {nextYear}
            </button>
          )}
          {prevYear != null && (
            <button type="button" className="hover:text-text" onClick={() => onYear(prevYear)}>
              {prevYear} ›
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
