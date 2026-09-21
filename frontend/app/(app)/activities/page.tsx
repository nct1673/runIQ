"use client";

import { useEffect, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";

/** Blueprint §8: list of imported activities, backed by GET /api/activities. */

interface Activity {
  id: string;
  started_at: string;
  distance_km: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  avg_cadence: number | null;
  elevation_gain_m: number | null;
  activity_type: string | null;
}

function formatPace(secPerKm: number | null): string {
  if (secPerKm == null) return "--";
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}/km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/activities/")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setActivities)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <Header title="Activities" subtitle="Imported, processed runs." />
      <Card>
        {error && <p className="text-sm text-negative">Failed to load activities: {error}</p>}
        {!error && !activities && <p className="text-sm text-text-muted">Loading...</p>}
        {activities && activities.length === 0 && (
          <EmptyPlaceholder label="No processed activities yet -- uploading a CSV only stores raw rows for now." />
        )}
        {activities && activities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 text-right font-medium">Distance (km)</th>
                  <th className="py-2 pr-4 text-right font-medium">Duration</th>
                  <th className="py-2 pr-4 text-right font-medium">Pace</th>
                  <th className="py-2 text-right font-medium">Avg HR</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 text-text last:border-0">
                    <td className="py-2 pr-4">{new Date(a.started_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{a.activity_type}</td>
                    <td className="py-2 pr-4 text-right">{a.distance_km.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right">{formatDuration(a.duration_s)}</td>
                    <td className="py-2 pr-4 text-right">{formatPace(a.avg_pace_s_per_km)}</td>
                    <td className="py-2 text-right">{a.avg_hr ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
