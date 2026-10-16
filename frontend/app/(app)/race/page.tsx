"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { EmptyPlaceholder } from "@/components/Card";
import { CalendarIcon, ClockIcon, DotsIcon, PinIcon, PlusIcon } from "@/components/icons";
import RaceDrawer from "@/components/race/RaceDrawer";
import RaceTimeline, { type TimelinePoint } from "@/components/race/RaceTimeline";
import { EMPTY_FORM, PR_TYPES, raceToForm, type PersonalRecord, type Race, type RaceFormValues } from "@/components/race/types";
import { formatDuration, formatPace, parseDurationInput } from "@/lib/format";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(dateStr + "T00:00:00");
  return Math.round((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRaceDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "05:00:00" -> "5:00 AM" -- flag-off time is stored/edited as HH:MM but
 * shown the way a runner reads a start time, not a 24h clock. */
function formatRaceTime(timeStr: string): string {
  return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Display (design: runIQ_draft/race_design.html)

const PRIORITY_CHIP: Record<string, string> = {
  A: "bg-brand text-white",
  B: "bg-violet/25 text-[#c9b6ff]",
  C: "bg-blue/20 text-blue",
};
const PRIORITY_INFO: Record<string, { name: string; hint: string }> = {
  A: { name: "Goal race", hint: "Full taper, peak effort" },
  B: { name: "Tune-up", hint: "Short taper, hard effort" },
  C: { name: "Training", hint: "Run through it" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function distanceName(km: number): string {
  const known: [number, string][] = [
    [5, "5K"],
    [10, "10K"],
    [21.0975, "Half marathon"],
    [42.195, "Marathon"],
  ];
  const match = known.find(([d]) => Math.abs(d - km) < 0.05);
  return match ? match[1] : "";
}

/** "Half marathon · 21.1 km · Flag-off 3:00 AM · Penang" */
function raceMeta(race: Race): string {
  const name = distanceName(race.distance_km);
  return [
    name ? `${name} · ${race.distance_km.toFixed(1)} km` : `${race.distance_km.toFixed(1)} km`,
    race.race_time ? `Flag-off ${formatRaceTime(race.race_time)}` : null,
    race.location,
  ]
    .filter(Boolean)
    .join(" · ");
}

function gapLabel(fromDate: string, toDate: string): string {
  const days = Math.round((parseDate(toDate).getTime() - parseDate(fromDate).getTime()) / DAY_MS);
  return days < 14 ? `${days} days` : `${Math.round(days / 7)} weeks`;
}

function shortDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function PriorityChip({ priority }: { priority: "A" | "B" | "C" }) {
  return (
    <span
      className={
        "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] text-[10.5px] font-extrabold " +
        PRIORITY_CHIP[priority]
      }
    >
      {priority}
    </span>
  );
}

function DateTile({ dateStr, done = false }: { dateStr: string; done?: boolean }) {
  const d = parseDate(dateStr);
  return (
    <div
      className={
        "flex h-[66px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[14px] border " +
        (done ? "border-positive/35 bg-positive/10" : "border-border bg-surface-hover")
      }
    >
      <small className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
        {d.toLocaleDateString(undefined, { month: "short" })}
      </small>
      <b className="text-2xl font-semibold leading-[1.1]">{d.getDate()}</b>
      <span className="text-[10px] text-text-muted">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-3.5 mt-7 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-soft">
      {title}
      <span className="h-px flex-1 bg-border" />
      {note && <em className="font-medium normal-case not-italic tracking-normal text-text-muted">{note}</em>}
    </div>
  );
}

function SetButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber/55 px-2.5 py-[5px] text-[13px] font-semibold text-[#ffd68a] hover:bg-amber/10"
    >
      ＋ {children}
    </button>
  );
}

function MoreMenu({ onEdit, onDelete, dark = false }: { onEdit?: () => void; onDelete: () => void; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((o) => !o)}
        className={
          "grid place-items-center text-text-muted hover:text-text " +
          (dark
            ? "h-9 w-9 rounded-[10px] border border-white/15 bg-bg/30"
            : "h-[34px] w-[34px] rounded-[9px] border border-border")
        }
      >
        <DotsIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1.5 w-32 overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-text-soft hover:bg-surface-hover"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-[13px] text-negative hover:bg-surface-hover"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

interface CardCommon {
  race: Race;
  prev: Race | null; // the race before this one (any status), for "N weeks after X"
  prLabel: string | null; // e.g. "half"
  prTimeS: number | null;
  onEdit: () => void;
  onMarkCompleted: () => void;
  onDelete: () => void;
}

function NextRaceHero({ race, prev, prLabel, prTimeS, onEdit, onMarkCompleted, onDelete }: CardCommon) {
  const days = daysUntil(race.race_date);
  const name = distanceName(race.distance_km);

  return (
    <section className="mt-[18px] grid grid-cols-[1fr_auto] gap-7 rounded-2xl border border-brand/35 bg-[radial-gradient(600px_300px_at_100%_0%,rgba(255,77,141,0.18),transparent_65%),radial-gradient(500px_260px_at_0%_100%,rgba(122,92,255,0.16),transparent_65%),#17143a] px-7 py-[26px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand/15 px-2.5 py-[5px] text-[11px] font-bold uppercase tracking-[0.06em] text-[#ff8fb8]">
            ⚑ Next race
          </span>
          {name && (
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-[5px] text-[11px] font-bold uppercase tracking-[0.06em] text-text-soft">
              {name}
            </span>
          )}
        </div>
        <div className="mb-1.5 mt-3 text-[30px] font-semibold tracking-[-0.02em]">{race.name}</div>
        <div className="flex flex-wrap gap-x-[18px] gap-y-1 text-[13.5px] text-text-soft">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-[15px] w-[15px] text-text-muted" />
            {formatRaceDate(race.race_date)}
          </span>
          {race.race_time && (
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-[15px] w-[15px] text-text-muted" />
              Flag-off {formatRaceTime(race.race_time)}
            </span>
          )}
          {race.location && (
            <span className="flex items-center gap-1.5">
              <PinIcon className="h-[15px] w-[15px] text-text-muted" />
              {race.location}
            </span>
          )}
        </div>

        <div className="mt-[22px] flex flex-wrap border-t border-white/10 pt-[18px] [&>div]:mr-[34px] [&>div]:border-r [&>div]:border-white/10 [&>div]:pr-[34px] [&>div:last-child]:mr-0 [&>div:last-child]:border-r-0 [&>div:last-child]:pr-0">
          <Fact label="Distance">
            <b className="mt-1.5 block text-xl font-semibold">{race.distance_km.toFixed(1)} km</b>
          </Fact>
          <Fact label="Goal time">
            {race.goal_time_s != null ? (
              <>
                <b className="mt-1.5 block text-xl font-semibold">{formatDuration(race.goal_time_s)}</b>
                <div className="mt-[5px] text-xs text-text-muted">
                  {formatPace(race.goal_time_s / race.distance_km)}
                  {prTimeS != null && ` · PR is ${formatDuration(prTimeS)}`}
                </div>
              </>
            ) : (
              <>
                <SetButton onClick={onEdit}>Set goal</SetButton>
                {prTimeS != null && (
                  <div className="mt-[5px] text-xs text-text-muted">
                    Your {prLabel} PR: {formatDuration(prTimeS)}
                  </div>
                )}
              </>
            )}
          </Fact>
          <Fact label="Priority">
            {race.priority ? (
              <>
                <b className="mt-1.5 flex items-center gap-2 text-xl font-semibold">
                  <PriorityChip priority={race.priority} />
                  {PRIORITY_INFO[race.priority].name}
                </b>
                <div className="mt-[5px] text-xs text-text-muted">{PRIORITY_INFO[race.priority].hint}</div>
              </>
            ) : (
              <SetButton onClick={onEdit}>Set A / B / C</SetButton>
            )}
          </Fact>
          {prev && (
            <Fact label="Since last race">
              <b className="mt-1.5 block text-xl font-semibold">{gapLabel(prev.race_date, race.race_date)}</b>
              <div className="mt-[5px] text-xs text-text-muted">
                after {prev.name}
                {distanceName(prev.distance_km) ? ` (${distanceName(prev.distance_km).toLowerCase()})` : ""}
              </div>
            </Fact>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between text-right">
        <div>
          <div className="text-[96px] font-semibold leading-[0.9] tracking-[-0.05em]">{Math.abs(days)}</div>
          <div className="mt-1.5 text-[15px] text-text-soft">
            {days === 0 ? "race day" : days > 0 ? (days === 1 ? "day to go" : "days to go") : "days ago"}
          </div>
        </div>
        <div className="flex gap-2">
          <HeroButton onClick={onEdit}>✎ Edit</HeroButton>
          <HeroButton onClick={onMarkCompleted}>✓ Mark completed</HeroButton>
          <MoreMenu dark onDelete={onDelete} />
        </div>
      </div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">{label}</small>
      {children}
    </div>
  );
}

function HeroButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-1.5 rounded-[10px] border border-white/15 bg-bg/30 px-3 text-[12.5px] text-text-soft hover:text-text"
    >
      {children}
    </button>
  );
}

function UpcomingCard({ race, prev, prTimeS, onEdit, onDelete }: CardCommon) {
  const days = daysUntil(race.race_date);
  return (
    <section className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-[22px] rounded-2xl border border-border bg-surface px-[22px] py-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <DateTile dateStr={race.race_date} />
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 text-[17px] font-semibold">
          <span className="truncate">{race.name}</span>
          {race.priority && <PriorityChip priority={race.priority} />}
        </div>
        <div className="mt-[5px] text-[13px] text-text-muted">{raceMeta(race)}</div>
        <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
          {prev && (
            <>
              <span>
                {gapLabel(prev.race_date, race.race_date)} after {prev.name.split(" ")[0]}
              </span>
              <span>·</span>
            </>
          )}
          {race.priority ? <span>{PRIORITY_INFO[race.priority].name}</span> : <span>Priority not set</span>}
        </div>
      </div>

      {race.goal_time_s != null ? (
        <div className="border-r border-border pr-[22px] text-right">
          <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">Goal</small>
          <b className="mt-1 block text-[22px] font-semibold">{formatDuration(race.goal_time_s)}</b>
          <span className="text-xs text-text-muted">
            {formatPace(race.goal_time_s / race.distance_km)}
            {prTimeS != null && ` · PR is ${formatDuration(prTimeS)}`}
          </span>
        </div>
      ) : (
        <div className="border-r border-border pr-[22px] text-right">
          <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">Goal</small>
          <SetButton onClick={onEdit}>Set goal</SetButton>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-[110px] text-right">
          <b className="block text-[26px] font-semibold">{Math.abs(days)}</b>
          <span className="text-xs text-text-muted">
            {days === 0 ? "race day" : days > 0 ? (days === 1 ? "day to go" : "days to go") : "days ago"}
          </span>
        </div>
        <MoreMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </section>
  );
}

function CompletedCard({ race, onEdit, onDelete }: CardCommon) {
  const delta =
    race.actual_time_s != null && race.goal_time_s != null ? race.actual_time_s - race.goal_time_s : null;
  const pct = delta != null && race.goal_time_s ? Math.round((Math.abs(delta) / race.goal_time_s) * 100) : null;

  return (
    <section className="grid grid-cols-[auto_1fr_auto] items-center gap-[22px] rounded-2xl border border-border bg-surface px-[22px] py-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <DateTile dateStr={race.race_date} done />
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 text-[17px] font-semibold">
          <span className="truncate">{race.name}</span>
          {race.priority && <PriorityChip priority={race.priority} />}
        </div>
        <div className="mt-[5px] text-[13px] text-text-muted">{raceMeta(race)}</div>
        {race.notes && <div className="mt-3 text-xs text-text-muted">{race.notes}</div>}
      </div>
      <div className="flex items-center gap-4">
        {race.goal_time_s != null || race.actual_time_s != null ? (
          <div className="grid grid-cols-[repeat(3,auto)] items-center [&>div]:border-l [&>div]:border-border [&>div]:px-[22px] [&>div]:text-right [&>div:first-child]:border-l-0">
            <Result label="Goal" value={race.goal_time_s} km={race.distance_km} muted />
            <Result label="Result" value={race.actual_time_s} km={race.distance_km} />
            <div>
              <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
                vs goal
              </small>
              {delta != null ? (
                <>
                  <b className={"mt-1 block text-[22px] font-semibold " + (delta <= 0 ? "text-positive" : "text-amber")}>
                    {delta <= 0 ? "-" : "+"}
                    {formatDuration(Math.abs(delta))}
                  </b>
                  <span className="text-xs text-text-muted">
                    {pct}% {delta <= 0 ? "faster" : "slower"}
                  </span>
                </>
              ) : (
                <b className="mt-1 block text-[22px] font-semibold text-text-muted">—</b>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-text-muted">No result logged</span>
        )}
        <MoreMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </section>
  );
}

function Result({ label, value, km, muted = false }: { label: string; value: number | null; km: number; muted?: boolean }) {
  return (
    <div>
      <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">{label}</small>
      {value != null ? (
        <>
          <b className={"mt-1 block text-[22px] font-semibold " + (muted ? "text-text-soft" : "")}>
            {formatDuration(value)}
          </b>
          <span className="text-xs text-text-muted">{formatPace(value / km)}</span>
        </>
      ) : (
        <b className="mt-1 block text-[22px] font-semibold text-text-muted">—</b>
      )}
    </div>
  );
}

export default function RacePage() {
  const [races, setRaces] = useState<Race[] | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAsCompleted, setEditAsCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  function load() {
    fetch("/api/races")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setRaces)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  // PRs only feed the "PR is ..." hints, so a failure just hides them.
  useEffect(() => {
    fetch("/api/personal-records")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PersonalRecord[]) => setPrs(data))
      .catch(() => setPrs([]));
  }, []);

  function prFor(km: number): { label: string | null; timeS: number | null } {
    const type = PR_TYPES.find((t) => Math.abs(t.km - km) < 0.05);
    const pr = type && prs.find((p) => p.type_id === type.type_id && p.metric === "time_s");
    return pr && type ? { label: type.name, timeS: pr.value } : { label: null, timeS: null };
  }

  function startEdit(id: string, asCompleted = false) {
    setEditingId(id);
    setEditAsCompleted(asCompleted);
    setAdding(false);
    setDrawerError(null);
  }

  function closeDrawer() {
    setAdding(false);
    setEditingId(null);
  }

  function payloadFromForm(values: RaceFormValues) {
    return {
      name: values.name.trim(),
      distance_km: Number(values.distance_km),
      race_date: values.race_date,
      race_time: values.race_time || null,
      location: values.location.trim() || null,
      notes: values.notes.trim() || null,
      goal_time_s: values.goal_time ? parseDurationInput(values.goal_time) : null,
      priority: values.priority || null,
    };
  }

  async function handleCreate(values: RaceFormValues) {
    setSaving(true);
    try {
      const res = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(values)),
      });
      if (!res.ok) throw new Error(await res.text());
      setAdding(false);
      load();
    } catch (err) {
      setDrawerError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, values: RaceFormValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/races/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payloadFromForm(values),
          status: values.status,
          actual_time_s: values.status === "completed" && values.actual_time ? parseDurationInput(values.actual_time) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      load();
    } catch (err) {
      setDrawerError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/races/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDate = [...(races ?? [])].sort((a, b) => a.race_date.localeCompare(b.race_date));
  const upcoming = byDate.filter((r) => r.status === "upcoming");
  const completed = byDate.filter((r) => r.status === "completed").reverse();
  const editingRace = races?.find((r) => r.id === editingId) ?? null;
  const hero = upcoming.find((r) => daysUntil(r.race_date) >= 0) ?? upcoming[0] ?? null;
  const restUpcoming = upcoming.filter((r) => r !== hero);

  const prevOf = (race: Race): Race | null => {
    const i = byDate.indexOf(race);
    return i > 0 ? byDate[i - 1] : null;
  };

  function cardProps(race: Race): CardCommon {
    const { label, timeS } = prFor(race.distance_km);
    return {
      race,
      prev: prevOf(race),
      prLabel: label,
      prTimeS: timeS,
      onEdit: () => startEdit(race.id),
      onMarkCompleted: () => startEdit(race.id, true),
      onDelete: () => handleDelete(race.id),
    };
  }

  function renderRace(race: Race, view: (p: CardCommon) => ReactNode) {
    return <Fragment key={race.id}>{view(cardProps(race))}</Fragment>;
  }

  // Season strip: the latest finished race (if recent), then what's ahead.
  const lastDone = completed.find((r) => today.getTime() - parseDate(r.race_date).getTime() < 120 * DAY_MS);
  const stripRaces = [...(lastDone ? [lastDone] : []), ...upcoming.slice(0, 5)].sort((a, b) =>
    a.race_date.localeCompare(b.race_date),
  );
  const points: TimelinePoint[] = stripRaces.map((r) => {
    const days = daysUntil(r.race_date);
    const kind = r.status === "completed" ? "done" : r === hero ? "next" : "upcoming";
    const sub =
      r.status === "completed"
        ? `${shortDate(r.race_date)}${r.actual_time_s != null ? ` · ${formatDuration(r.actual_time_s)}` : ""}`
        : `${shortDate(r.race_date)} · ${days === 0 ? "today" : days > 0 ? `in ${days} days` : `${-days} days ago`}`;
    const name = distanceName(r.distance_km).replace(" marathon", "").replace(/^Marathon$/, "Full");
    const short = r.name.length > 20 ? r.name.slice(0, 19).trimEnd() + "…" : r.name;
    return { date: parseDate(r.race_date), label: name ? `${short} · ${name}` : short, sub, kind };
  });

  const year = today.getFullYear();
  const completedThisYear = completed.filter((r) => parseDate(r.race_date).getFullYear() === year).length;
  const kmAhead = upcoming.reduce((sum, r) => sum + r.distance_km, 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-[22px] flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Races</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em]">Race calendar</h1>
          <p className="mt-1 text-sm text-text-soft">Your upcoming races, goals and results in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
            setDrawerError(null);
          }}
          className="flex h-10 items-center gap-2 rounded-[11px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] px-4 text-[13.5px] font-semibold text-white"
        >
          <PlusIcon className="h-4 w-4" />
          Add race
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-negative">{error}</p>}
      {!error && !races && <p className="text-sm text-text-muted">Loading...</p>}

      {races && races.length === 0 && !adding && (
        <EmptyPlaceholder label='No races yet -- press "Add race" to plan your next one.' />
      )}

      {races && races.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface px-6 pb-[18px] pt-5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div className="mb-1.5 flex items-center justify-between">
            <b className="text-[15px] font-semibold">Season {year}</b>
            <div className="flex gap-[22px] text-[12.5px] text-text-muted">
              <span>
                <b className="text-[13px] text-text">{upcoming.length}</b> upcoming
              </span>
              <span>
                <b className="text-[13px] text-text">{completedThisYear}</b> completed
              </span>
              <span>
                <b className="text-[13px] text-text">{kmAhead.toFixed(1)} km</b> of racing ahead
              </span>
            </div>
          </div>
          <RaceTimeline points={points} today={today} />
        </section>
      )}

      {hero && renderRace(hero, (p) => <NextRaceHero {...p} />)}

      {restUpcoming.length > 0 && (
        <>
          <SectionTitle title="Upcoming" note={`${restUpcoming.length} more`} />
          <div className="flex flex-col gap-3">{restUpcoming.map((r) => renderRace(r, (p) => <UpcomingCard {...p} />))}</div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <SectionTitle
            title="Completed"
            note={`${completed.length} race${completed.length === 1 ? "" : "s"}`}
          />
          <div className="flex flex-col gap-3">{completed.map((r) => renderRace(r, (p) => <CompletedCard {...p} />))}</div>
        </>
      )}

      {adding && (
        <RaceDrawer
          mode="add"
          initial={EMPTY_FORM}
          prs={prs}
          submitting={saving}
          serverError={drawerError}
          onCancel={closeDrawer}
          onSubmit={handleCreate}
        />
      )}
      {editingRace && (
        <RaceDrawer
          key={`edit-${editingRace.id}`}
          mode="edit"
          initial={editAsCompleted ? { ...raceToForm(editingRace), status: "completed" } : raceToForm(editingRace)}
          prs={prs}
          submitting={saving}
          serverError={drawerError}
          onCancel={closeDrawer}
          onSubmit={(values) => handleUpdate(editingRace.id, values)}
        />
      )}
    </div>
  );
}
