"use client";

import { useEffect, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import Header, { HeaderIconButton } from "@/components/Header";
import {
  BellIcon,
  BoltIcon,
  ChevronDownIcon,
  ClockIcon,
  DotsIcon,
  HomeIcon,
  RefreshIcon,
  TrendingUpIcon,
} from "@/components/icons";
import MiniCalendar from "@/components/MiniCalendar";
import StatCard from "@/components/StatCard";

interface Summary {
  total_runs: number;
  total_distance_km: number;
  total_duration_s: number;
}

function formatTotalDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Blueprint §10: "what is happening to my running?" overview.
 *
 * The four top stats are wired to GET /api/analytics/summary (real
 * activities-table aggregates); Weekly Mileage/Zone Split/Time
 * Predictor/Schedule are still explicit placeholders since their
 * backing services (analytics_service.get_trends, training_load_service,
 * prediction_service, goal_service) are all still stubs -- a bigger
 * piece than the summary totals, not part of this pass.
 */
export default function DashboardPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  function loadSummary() {
    fetch("/api/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null));
  }

  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => setDisplayName(profile?.display_name || null))
      .catch(() => setDisplayName(null));

    loadSummary();
  }, []);

  async function handleUpdateData() {
    setUpdating(true);
    setUpdateStatus(null);

    try {
      const res = await fetch("/api/activities/sync-garmin", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      loadSummary(); // reflect the new activities in the stat cards right away
    } catch (err) {
      setUpdateStatus(`Update failed: ${(err as Error).message}`);
    } finally {
      setUpdating(false);
    }
  }

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
        <StatCard
          icon={HomeIcon}
          colorClassName="bg-stat-runs"
          label="Total Runs"
          value={summary ? String(summary.total_runs) : undefined}
        />
        <StatCard
          icon={TrendingUpIcon}
          colorClassName="bg-stat-distance"
          label="Total Distance"
          value={summary ? `${summary.total_distance_km.toFixed(1)} km` : undefined}
        />
        <StatCard
          icon={ClockIcon}
          colorClassName="bg-stat-time"
          label="Total Time"
          value={summary ? formatTotalDuration(summary.total_duration_s) : undefined}
        />
        {/* Total Energy: no calories column on Activity yet -- see StatCard's comment */}
        <StatCard icon={BoltIcon} colorClassName="bg-stat-energy" label="Total Energy" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card title="Weekly Mileage" href="/analytics">
              <EmptyPlaceholder label="No data yet" />
            </Card>
            <Card title="Zone Split" href="/analytics">
              <EmptyPlaceholder label="No data yet" />
            </Card>
          </div>

          <Card title="Time Predictor" href="/predictions">
            <EmptyPlaceholder label="No prediction yet" />
          </Card>
        </div>

        <Card title="Your Schedule" href="/goals">
          <MiniCalendar />
          <div className="mt-5 border-t border-border pt-5">
            <EmptyPlaceholder label="No scheduled workouts yet" />
          </div>
        </Card>
      </div>
    </div>
  );
}
