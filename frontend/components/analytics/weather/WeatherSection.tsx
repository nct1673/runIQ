"use client";

import { useEffect, useState } from "react";

import type { WeatherImpact } from "@/lib/weather";

import HeatAdaptationCard from "./HeatAdaptationCard";
import HeatAdjustedCard from "./HeatAdjustedCard";
import HeatCostCard from "./HeatCostCard";
import StartTimeCard from "./StartTimeCard";

/** Analytics > Weather & conditions. One fetch (GET /api/analytics/weather-impact) feeds all four cards. */
export default function WeatherSection({ months }: { months: number }) {
  const [data, setData] = useState<WeatherImpact | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch(`/api/analytics/weather-impact?months=${months}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((d: WeatherImpact) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [months]);

  if (error) return <p className="text-sm text-negative">Failed to load weather analytics.</p>;
  if (!data) return <p className="text-sm text-text-muted">Loading...</p>;
  if (data.outdoor_runs === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
        No outdoor runs with weather data in this range.
      </div>
    );
  }

  return (
    <>
      <section className="grid grid-cols-1 gap-[18px] xl:grid-cols-[1.55fr_1fr]">
        <HeatCostCard data={data} />
        <HeatAdaptationCard data={data} />
      </section>
      <StartTimeCard data={data} />
      <HeatAdjustedCard data={data} />
    </>
  );
}
