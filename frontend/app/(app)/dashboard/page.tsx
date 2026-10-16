"use client";

import { useEffect, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import MonthlyMileageChart, { MonthlyMileagePoint } from "@/components/charts/MonthlyMileageChart";
import WeeklyMileageChart, { WeeklyMileagePoint } from "@/components/charts/WeeklyMileageChart";
import Header, { HeaderIconButton } from "@/components/Header";
import { BellIcon, RefreshIcon, SwapIcon } from "@/components/icons";
import { IntensityCard, SurfaceCard, TrainingEffectCard } from "@/components/dashboard/MixCards";
import type { DashboardActivity } from "@/components/dashboard/mixStats";
import { bestVdot, type PersonalRecord } from "@/components/analytics/records";
import FitnessSnapshotCard from "@/components/FitnessSnapshotCard";
import KpiCard, { Delta } from "@/components/KpiCard";
import LatestRunCard from "@/components/LatestRunCard";
import WeekStripCard from "@/components/WeekStripCard";

interface Summary {
  vo2_max: number | null;
  vo2max_delta_pct: number | null;
}

// /api/activities rows: enough for the calendar (date + distance) and the Latest Run card.
type ActivityRow = DashboardActivity;

interface RaceListItem {
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
}

/**
 * Blueprint §10 high-level overview. Every card here is wired to real
 * `activities`-table aggregates (see app/services/analytics_service.py).
 * The dot-scatter trend charts (pace + biomechanics) and Personal Records
 * live on /analytics instead of here.
 */
export default function DashboardPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weeklyMileage, setWeeklyMileage] = useState<WeeklyMileagePoint[] | null>(null);
  const [monthlyMileage, setMonthlyMileage] = useState<MonthlyMileagePoint[] | null>(null);
  const [mileageView, setMileageView] = useState<"weekly" | "monthly">("weekly");
  const [activityDates, setActivityDates] = useState<ActivityRow[] | null>(null);
  const [easyRuns, setEasyRuns] = useState<{ avg_pace_s_per_km: number }[] | null>(null);
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);
  const [races, setRaces] = useState<RaceListItem[] | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  function loadDashboardData() {
    fetch("/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null));

    // Easy runs (Garmin AEROBIC_BASE) from the last 2 months, oldest first.
    fetch("/api/analytics/pace-trend?months=2")
      .then((res) => (res.ok ? res.json() : null))
      .then(setEasyRuns)
      .catch(() => setEasyRuns(null));

    fetch("/api/analytics/weekly-mileage?weeks=10")
      .then((res) => (res.ok ? res.json() : null))
      .then(setWeeklyMileage)
      .catch(() => setWeeklyMileage(null));

    fetch("/api/analytics/monthly-mileage?months=12")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMonthlyMileage)
      .catch(() => setMonthlyMileage(null));

    fetch("/api/activities")
      .then((res) => (res.ok ? res.json() : null))
      .then(setActivityDates)
      .catch(() => setActivityDates(null));

    fetch("/api/personal-records")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRecords)
      .catch(() => setRecords(null));

    fetch("/api/races")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRaces)
      .catch(() => setRaces(null));
  }

  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => setDisplayName(profile?.display_name || null))
      .catch(() => setDisplayName(null));

    loadDashboardData();
  }, []);

  async function handleUpdateData() {
    setUpdating(true);
    setUpdateStatus(null);

    try {
      const res = await fetch("/api/activities/sync-garmin", {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      loadDashboardData(); // reflect the new activities everywhere right away

      // Personal records are a separate Garmin sync, kept in its own
      // try/catch so a failure here doesn't mask the activities sync
      // having already succeeded. No card on this page to refresh
      // anymore (moved to /analytics) -- this just keeps the data
      // fresh for whenever that page is next opened.
      try {
        const prRes = await fetch("/api/personal-records/sync", {
          method: "POST",
        });
        if (!prRes.ok) throw new Error(await prRes.text());
      } catch (prErr) {
        setUpdateStatus(`Activities updated, but personal records sync failed: ${(prErr as Error).message}`);
      }
    } catch (err) {
      setUpdateStatus(`Update failed: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const eyebrow = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ---- derived display numbers (all from the endpoints already loaded) ----
  const thisWeek = weeklyMileage?.[weeklyMileage.length - 1];
  const lastWeek = weeklyMileage && weeklyMileage.length > 1 ? weeklyMileage[weeklyMileage.length - 2] : undefined;
  const weekDiffKm = thisWeek && lastWeek ? thisWeek.distance_km - lastWeek.distance_km : null;

  // Easy-run pace: mean over the last 2 months of easy runs.
  const easyPaces = (easyRuns ?? []).map((r) => r.avg_pace_s_per_km);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : null);
  const easyPace = mean(easyPaces);

  const completedWeeks = weeklyMileage && weeklyMileage.length > 1 ? weeklyMileage.slice(-5, -1) : [];
  const avgWeeklyKm = completedWeeks.length
    ? completedWeeks.reduce((sum, w) => sum + w.distance_km, 0) / completedWeeks.length
    : null;

  return (
    <div>
      <Header title={`${greeting}, ${displayName || "Runner"}`} eyebrow={eyebrow}>
        <button
          type="button"
          onClick={handleUpdateData}
          disabled={updating}
          className="flex h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-soft hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-75"
        >
          <RefreshIcon className={"h-[15px] w-[15px] shrink-0" + (updating ? " animate-spin" : "")} />
          {updating ? "Syncing..." : "Sync"}
        </button>
        <HeaderIconButton label="Notifications">
          <BellIcon className="h-5 w-5" />
        </HeaderIconButton>
      </Header>

      {updateStatus && <p className="-mt-3 mb-4 text-sm text-text-muted">{updateStatus}</p>}

      {/* Hero: this week + the last 30 days, then the week strip with the next race, beside how my fitness looks right now. */}
      <section className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[7fr_3fr]">
        {/* This week + how the last 30 days were spent: surface, intensity, run types. */}
        <div className="flex flex-col gap-[18px] lg:col-start-1 lg:row-start-1">
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              accent="#b6f35a"
              label="This week"
              hint="Mon-Sun"
              value={thisWeek ? thisWeek.distance_km.toFixed(1) : "--"}
              unit="km"
              footLeft={thisWeek ? `${thisWeek.runs} ${thisWeek.runs === 1 ? "run" : "runs"}` : undefined}
              footRight={
                weekDiffKm != null && lastWeek ? (
                  <Delta
                    value={weekDiffKm}
                    text={`${weekDiffKm > 0 ? "+" : weekDiffKm < 0 ? "-" : ""}${Math.abs(weekDiffKm).toFixed(1)} km vs last wk`}
                  />
                ) : undefined
              }
            />
            <SurfaceCard activities={activityDates} />
            <IntensityCard activities={activityDates} />
            <TrainingEffectCard activities={activityDates} />
          </div>
          <WeekStripCard runs={activityDates} races={races} />
        </div>
        <div className="flex flex-col gap-[18px]">
          <FitnessSnapshotCard
            vo2Max={summary?.vo2_max}
            easyPaceSPerKm={easyPace}
            easyRunCount={easyPaces.length}
            avgWeeklyKm={avgWeeklyKm}
            vdot={bestVdot(records)}
          />
          <LatestRunCard activities={activityDates} />
        </div>
      </section>

      {/* Main grid: trends and last run on the left, habits and the week on the right. */}
      <section className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-[18px]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <i className="inline-block h-2 w-2 rounded-full bg-violet" />
                {mileageView === "weekly" ? "Weekly mileage" : "Monthly mileage"}
              </div>
              <button
                type="button"
                onClick={() => setMileageView((v) => (v === "weekly" ? "monthly" : "weekly"))}
                title={`Switch to ${mileageView === "weekly" ? "monthly" : "weekly"} view`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
              >
                <SwapIcon className="h-4 w-4" />
              </button>
            </div>
            {mileageView === "weekly" ? (
              weeklyMileage ? (
                <WeeklyMileageChart data={weeklyMileage} />
              ) : (
                <EmptyPlaceholder label="Loading..." />
              )
            ) : monthlyMileage ? (
              <MonthlyMileageChart data={monthlyMileage} />
            ) : (
              <EmptyPlaceholder label="Loading..." />
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
