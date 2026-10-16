"use client";

import { useEffect, useState } from "react";

import type { WeatherImpact } from "@/lib/weather";

/** GET /api/analytics/weather-impact for the Conditions tab and the Overview
 * summary card, fetched once by the page. */
export function useWeatherImpact(months: number): { data: WeatherImpact | null; error: boolean } {
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

  return { data, error };
}
