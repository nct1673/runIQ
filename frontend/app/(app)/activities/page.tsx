"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyPlaceholder } from "@/components/Card";
import RunDetail from "@/components/activities/RunDetail";
import RunList from "@/components/activities/RunList";
import { UnavailableButton } from "@/components/activities/shared";
import Toolbar from "@/components/activities/Toolbar";
import YearStrip from "@/components/activities/YearStrip";
import Header from "@/components/Header";
import { RefreshIcon } from "@/components/icons";
import {
  groupByMonth,
  matchesFilter,
  matchesQuery,
  monthKeyOf,
  raceRunIds,
  summarizeYear,
  type Activity,
  type ActivityDetail,
  type DetailState,
  type FilterKey,
  type Race,
  type SortKey,
} from "@/lib/activities";

/** Blueprint §8: imported runs. A month-grouped list on the left, the selected
 * run's full record on the right. Data: GET /api/activities (list),
 * GET /api/activities/{id} (detail, fetched on selection), GET /api/races. */
export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [yearChoice, setYearChoice] = useState<number | null>(null);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});

  useEffect(() => {
    fetch("/api/activities")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data: Activity[]) => {
        setActivities(data);
        // Start on the newest run, with its month open.
        if (data.length > 0) {
          setSelectedId(data[0].id);
          setOpenMonths(new Set([monthKeyOf(data[0].started_at)]));
        }
      })
      .catch((err) => setError(err.message));

    // Races only power the "Races & PRs" filter / Race tag, so a failure is non-fatal.
    fetch("/api/races")
      .then((res) => (res.ok ? res.json() : []))
      .then(setRaces)
      .catch(() => undefined);
  }, []);

  // Load the selected run's full record once, on first selection.
  useEffect(() => {
    if (!selectedId || selectedId in details) return;
    setDetails((prev) => ({ ...prev, [selectedId]: "loading" }));
    fetch(`/api/activities/${selectedId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((detail: ActivityDetail) => setDetails((prev) => ({ ...prev, [selectedId]: detail })))
      .catch(() => setDetails((prev) => ({ ...prev, [selectedId]: "error" })));
  }, [selectedId, details]);

  const all = useMemo(() => activities ?? [], [activities]);
  const years = useMemo(
    () => Array.from(new Set(all.map((a) => new Date(a.started_at).getFullYear()))).sort((a, b) => b - a),
    [all],
  );
  const year = yearChoice ?? years[0] ?? new Date().getFullYear();

  const yearRuns = useMemo(() => all.filter((a) => new Date(a.started_at).getFullYear() === year), [all, year]);
  const raceIds = useMemo(() => raceRunIds(all, races), [all, races]);
  const summary = useMemo(() => summarizeYear(all, year), [all, year]);

  const counts = useMemo(() => {
    const keys: FilterKey[] = ["all", "outdoor", "treadmill", "long", "records"];
    return Object.fromEntries(keys.map((k) => [k, yearRuns.filter((a) => matchesFilter(a, k, raceIds)).length])) as Record<
      FilterKey,
      number
    >;
  }, [yearRuns, raceIds]);

  const visible = useMemo(
    () => yearRuns.filter((a) => matchesFilter(a, filter, raceIds) && matchesQuery(a, query)),
    [yearRuns, filter, query, raceIds],
  );
  const groups = useMemo(() => groupByMonth(visible, sort), [visible, sort]);
  const flat = useMemo(() => groups.flatMap((g) => g.activities), [groups]);

  const selected = all.find((a) => a.id === selectedId) ?? null;
  const selectedIndex = flat.findIndex((a) => a.id === selectedId);

  function openMonthOf(a: Activity) {
    setOpenMonths((prev) => new Set(prev).add(monthKeyOf(a.started_at)));
  }

  function select(a: Activity) {
    setSelectedId(a.id);
    openMonthOf(a);
  }

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function goToYear(y: number) {
    setYearChoice(y);
    const newest = all.filter((a) => new Date(a.started_at).getFullYear() === y)[0];
    if (newest) select(newest);
  }

  const idx = years.indexOf(year);
  const prevYear = idx >= 0 && idx < years.length - 1 ? years[idx + 1] : null;
  const nextYear = idx > 0 ? years[idx - 1] : null;

  const selectedDate = selected ? new Date(selected.started_at) : null;
  const highlightMonth = selectedDate && selectedDate.getFullYear() === year ? selectedDate.getMonth() : null;
  const maxMonthKm = Math.max(1, ...summary.months.map((m) => m.km));

  return (
    <div>
      <Header
        eyebrow="Activities"
        title="Run history"
        subtitle="Every imported run, newest first. Pick one to see its full record."
      >
        <UnavailableButton
          label="Import runs"
          className="flex h-[38px] items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-soft"
        >
          <RefreshIcon className="h-[15px] w-[15px]" strokeWidth={2} />
          Import runs
        </UnavailableButton>
      </Header>

      {error && <p className="text-sm text-negative">Failed to load activities: {error}</p>}
      {!error && !activities && <p className="text-sm text-text-muted">Loading...</p>}
      {activities && activities.length === 0 && (
        <EmptyPlaceholder label="No processed activities yet -- press Update Data on the dashboard." />
      )}

      {activities && activities.length > 0 && (
        <>
          <YearStrip summary={summary} highlightMonth={highlightMonth} />

          <Toolbar
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            counts={counts}
            sort={sort}
            onSort={setSort}
          />

          <section className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,500px)_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
            {groups.length > 0 ? (
              <RunList
                groups={groups}
                maxMonthKm={maxMonthKm}
                openMonths={openMonths}
                onToggleMonth={toggleMonth}
                selectedId={selectedId}
                onSelect={(id) => {
                  const a = all.find((x) => x.id === id);
                  if (a) select(a);
                }}
                raceIds={raceIds}
                prevYear={prevYear}
                nextYear={nextYear}
                onYear={goToYear}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
                No runs match these filters.
              </div>
            )}

            {selected && (
              <RunDetail
                activity={selected}
                detail={details[selected.id]}
                all={all}
                onPrev={selectedIndex > 0 ? () => select(flat[selectedIndex - 1]) : null}
                onNext={
                  selectedIndex >= 0 && selectedIndex < flat.length - 1
                    ? () => select(flat[selectedIndex + 1])
                    : selectedIndex < 0 && flat.length > 0
                      ? () => select(flat[0])
                      : null
                }
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
