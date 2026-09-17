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
  TrendingUpIcon,
} from "@/components/icons";
import MiniCalendar from "@/components/MiniCalendar";
import StatCard from "@/components/StatCard";

/**
 * Blueprint §10: "what is happening to my running?" overview.
 *
 * UI-framework phase only -- the shell/layout is real, but every
 * chart/stat/schedule slot is an explicit placeholder rather than
 * fabricated numbers, since app/services/analytics_service.py,
 * training_load_service.py and goal_service.py are all still stubs.
 */
export default function DashboardPage() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => setDisplayName(profile?.display_name || null))
      .catch(() => setDisplayName(null));
  }, []);

  return (
    <div>
      <Header
        title={`Welcome, ${displayName || "Runner"}`}
        subtitle="Here's what's happening with your training."
      >
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={HomeIcon} colorClassName="bg-stat-runs" label="Total Runs" />
        <StatCard icon={TrendingUpIcon} colorClassName="bg-stat-distance" label="Total Distance" />
        <StatCard icon={ClockIcon} colorClassName="bg-stat-time" label="Total Time" />
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
