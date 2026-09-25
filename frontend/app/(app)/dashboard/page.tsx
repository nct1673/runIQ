"use client";

import { useEffect, useMemo, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import MetricTrendChart, { BiomechanicsTrendPoint } from "@/components/charts/MetricTrendChart";
import MonthlyMileageChart, { MonthlyMileagePoint } from "@/components/charts/MonthlyMileageChart";
import PaceTrendChart, { PaceTrendPoint } from "@/components/charts/PaceTrendChart";
import WeeklyMileageChart, { WeeklyMileagePoint } from "@/components/charts/WeeklyMileageChart";
import Header, { HeaderIconButton } from "@/components/Header";
import {
  BellIcon,
  BoltIcon,
  ChevronDownIcon,
  ClockIcon,
  DotsIcon,
  RefreshIcon,
  SwapIcon,
  TrendingUpIcon,
} from "@/components/icons";
import MiniCalendar, { RunDay } from "@/components/MiniCalendar";
import StatCard from "@/components/StatCard";
import { formatDuration, formatPace, formatTotalDuration } from "@/lib/format";

interface Summary {
  total_runs: number;
  total_distance_km: number;
  total_duration_s: number;
  avg_pace_s_per_km: number | null;
  distance_delta_pct: number | null;
}

interface ActivityDate {
  id: string;
  started_at: string;
  distance_km: number;
}

interface Prediction {
  distance_label: string;
  predicted_time_s: number;
}

const PREDICTOR_DISTANCES: { label: string; distance_label: string }[] = [
  { label: "5K", distance_label: "5K" },
  { label: "10K", distance_label: "10K" },
  { label: "Half", distance_label: "half_marathon" },
];

/**
 * Blueprint §10: "what is happening to my running?" overview. Every card
 * here is wired to real `activities`-table aggregates (see
 * app/services/analytics_service.py). Time Predictor is the one
 * exception -- it's Garmin's own race predictor (see
 * app/services/prediction_service.py), a stopgap until RunIQ's own
 * model (app/ml/) exists.
 */
export default function DashboardPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weeklyMileage, setWeeklyMileage] = useState<WeeklyMileagePoint[] | null>(null);
  const [monthlyMileage, setMonthlyMileage] = useState<MonthlyMileagePoint[] | null>(null);
  const [mileageView, setMileageView] = useState<"weekly" | "monthly">("weekly");
  const [paceTrend, setPaceTrend] = useState<PaceTrendPoint[] | null>(null);
  const [biomechanicsTrend, setBiomechanicsTrend] = useState<BiomechanicsTrendPoint[] | null>(null);
  const [activityDates, setActivityDates] = useState<ActivityDate[] | null>(null);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  function loadDashboardData() {
    fetch("/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null));

    fetch("/api/analytics/weekly-mileage?weeks=10")
      .then((res) => (res.ok ? res.json() : null))
      .then(setWeeklyMileage)
      .catch(() => setWeeklyMileage(null));

    fetch("/api/analytics/monthly-mileage?months=12")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMonthlyMileage)
      .catch(() => setMonthlyMileage(null));

    fetch("/api/analytics/pace-trend?months=6")
      .then((res) => (res.ok ? res.json() : null))
      .then(setPaceTrend)
      .catch(() => setPaceTrend(null));

    fetch("/api/analytics/biomechanics-trend?months=6")
      .then((res) => (res.ok ? res.json() : null))
      .then(setBiomechanicsTrend)
      .catch(() => setBiomechanicsTrend(null));

    fetch("/api/activities")
      .then((res) => (res.ok ? res.json() : null))
      .then(setActivityDates)
      .catch(() => setActivityDates(null));

    fetch("/api/predictions")
      .then((res) => (res.ok ? res.json() : null))
      .then(setPredictions)
      .catch(() => setPredictions(null));
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
      const res = await fetch("/api/activities/sync-garmin", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      loadDashboardData(); // reflect the new activities everywhere right away
    } catch (err) {
      setUpdateStatus(`Update failed: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  }

  const runsByDate = useMemo(() => {
    const map = new Map<string, RunDay>();
    for (const a of activityDates ?? []) {
      const key = a.started_at.slice(0, 10); // "YYYY-MM-DD" prefix of the ISO timestamp
      const entry = map.get(key) ?? { count: 0, distance_km: 0 };
      entry.count += 1;
      entry.distance_km += a.distance_km;
      map.set(key, entry);
    }
    return map;
  }, [activityDates]);

  return (
    <div>
      <Header
        title={`Welcome, ${displayName || "Runner"}`}
        subtitle="Here's what's happening with your training."
      >
        <button
          type="button"
          onClick={handleUpdateData}
          disabled={updating}
          className="flex w-[160px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-75"
        >
          <RefreshIcon className={"h-4 w-4 shrink-0" + (updating ? " animate-spin" : "")} />
          {updating ? "Updating..." : "Update Data"}
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text"
        >
          Last 30 days
          <ChevronDownIcon className="h-4 w-4 text-text-muted" />
        </button>
        <HeaderIconButton label="Notifications">
          <BellIcon className="h-5 w-5" />
        </HeaderIconButton>
        <HeaderIconButton label="More">
          <DotsIcon className="h-5 w-5" />
        </HeaderIconButton>
      </Header>

      {updateStatus && <p className="-mt-3 mb-4 text-sm text-text-muted">{updateStatus}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card title="Weekly Mileage">
          <EmptyPlaceholder label="No data" />
        </Card>
        <StatCard
          icon={TrendingUpIcon}
          colorClassName="bg-stat-distance"
          label="Total Distance"
          value={summary ? `${summary.total_distance_km.toFixed(1)} km` : undefined}
          deltaPct={summary?.distance_delta_pct}
        />
        <StatCard
          icon={ClockIcon}
          colorClassName="bg-stat-time"
          label="Total Time"
          value={summary ? formatTotalDuration(summary.total_duration_s) : undefined}
        />
        <StatCard
          icon={BoltIcon}
          colorClassName="bg-stat-energy"
          label="Avg Pace"
          value={summary?.avg_pace_s_per_km != null ? formatPace(summary.avg_pace_s_per_km) : undefined}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card title="Pace Trend">
              {paceTrend ? <PaceTrendChart data={paceTrend} months={6} /> : <EmptyPlaceholder label="Loading..." />}
            </Card>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-muted">
                  {mileageView === "weekly" ? "Weekly Mileage" : "Monthly Mileage"}
                </h3>
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

          <Card title="Time Predictor">
            {predictions && predictions.length > 0 ? (
              <div className="flex h-full flex-col justify-center gap-4">
                {PREDICTOR_DISTANCES.map(({ label, distance_label }) => {
                  const prediction = predictions.find((p) => p.distance_label === distance_label);
                  return (
                    <div key={distance_label} className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">{label}</span>
                      <span className="font-semibold text-text">
                        {prediction ? formatDuration(prediction.predicted_time_s) : "--"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyPlaceholder label={predictions ? "No prediction yet" : "Loading..."} />
            )}
          </Card>
        </div>

        <Card title="Your Schedule">
          <MiniCalendar runsByDate={runsByDate} />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Cadence">
          {biomechanicsTrend ? (
            <MetricTrendChart
              data={biomechanicsTrend}
              getValue={(d) => d.avg_cadence}
              formatValue={(v) => `${Math.round(v)} spm`}
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card title="Stride Length">
          {biomechanicsTrend ? (
            <MetricTrendChart
              data={biomechanicsTrend}
              getValue={(d) => d.avg_stride_length}
              formatValue={(v) => `${v.toFixed(1)} cm`}
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card title="Vertical Oscillation">
          {biomechanicsTrend ? (
            <MetricTrendChart
              data={biomechanicsTrend}
              getValue={(d) => d.avg_vertical_oscillation}
              formatValue={(v) => `${v.toFixed(1)} cm`}
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card title="Vertical Ratio">
          {biomechanicsTrend ? (
            <MetricTrendChart
              data={biomechanicsTrend}
              getValue={(d) => d.avg_vertical_ratio}
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card title="Ground Contact Time">
          {biomechanicsTrend ? (
            <MetricTrendChart
              data={biomechanicsTrend}
              getValue={(d) => d.avg_ground_contact_time}
              formatValue={(v) => `${Math.round(v)} ms`}
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
      </div>
    </div>
  );
}
