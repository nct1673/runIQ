"use client";

import { useEffect, useState } from "react";

import { EmptyPlaceholder } from "@/components/Card";

interface TypeSplitEntry {
  activity_type: string;
  runs: number;
  distance_km: number;
}

const TYPE_LABEL: Record<string, string> = {
  running: "Outdoor",
  treadmill_running: "Treadmill",
  unknown: "Unknown",
};
const TYPE_COLOR: Record<string, string> = {
  running: "bg-stat-runs",
  treadmill_running: "bg-stat-time",
  unknown: "bg-surface-hover",
};

/** Run count + distance split by activity_type (outdoor vs treadmill) --
 * GET /api/analytics/type-split (app.services.analytics_service.get_type_split),
 * a real breakdown that already existed on the backend with no frontend
 * consumer until now. */
export default function TypeSplitCard() {
  const [data, setData] = useState<TypeSplitEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/type-split")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const totalDistance = data?.reduce((sum, d) => sum + d.distance_km, 0) ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-medium text-text-muted">Activity Type Split</h3>

      {!data ? (
        <EmptyPlaceholder label="Loading..." />
      ) : data.length === 0 ? (
        <EmptyPlaceholder label="No data yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((d) => {
            const pct = totalDistance > 0 ? (d.distance_km / totalDistance) * 100 : 0;
            return (
              <div key={d.activity_type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-text">{TYPE_LABEL[d.activity_type] ?? d.activity_type}</span>
                  <span className="text-text-muted">
                    {d.distance_km.toFixed(1)} km · {d.runs} run{d.runs === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className={"h-full rounded-full " + (TYPE_COLOR[d.activity_type] ?? "bg-text-muted")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
