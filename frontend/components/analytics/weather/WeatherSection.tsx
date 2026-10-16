"use client";

import type { WeatherImpact } from "@/lib/weather";

import HeatAdaptationCard from "./HeatAdaptationCard";
import HeatAdjustedCard from "./HeatAdjustedCard";
import HeatCostCard from "./HeatCostCard";
import StartTimeCard from "./StartTimeCard";

/** Analytics > Conditions tab. The page fetches GET /api/analytics/weather-impact once
 * (useWeatherImpact) and it feeds all four cards. */
export default function WeatherSection({ data, error }: { data: WeatherImpact | null; error: boolean }) {
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
