import { linearRegressionLine } from "@/components/charts/trendMath";

export interface SeriesPoint {
  t: number; // ms epoch
  v: number;
  treadmill: boolean;
}

export interface SeriesStats {
  avg30: number | null; // mean over the 30 days up to the latest point
  change: number | null; // avg30 minus the mean of the first 30 days (null if windows overlap)
  changeGood: boolean;
  improving: boolean; // fitted trend line moves in the metric's good direction
  firstT: number;
}

const DAY = 86_400_000;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Headline numbers for one metric card. `good` is the direction that counts as better. */
export function analyzeSeries(points: SeriesPoint[], good: "up" | "down"): SeriesStats | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const firstT = sorted[0].t;
  const lastT = sorted[sorted.length - 1].t;

  const fit = linearRegressionLine(sorted.map((p) => ({ x: p.t, y: p.v })));
  const trendDelta = fit[fit.length - 1].y - fit[0].y;
  const improving = good === "up" ? trendDelta >= 0 : trendDelta <= 0;

  const recent = sorted.filter((p) => p.t >= lastT - 30 * DAY).map((p) => p.v);
  const early = sorted.filter((p) => p.t <= firstT + 30 * DAY).map((p) => p.v);
  const avg30 = recent.length ? mean(recent) : null;
  const disjoint = lastT - 30 * DAY > firstT + 30 * DAY;
  const change = disjoint && avg30 != null && early.length ? avg30 - mean(early) : null;
  const changeGood = change == null ? improving : good === "up" ? change >= 0 : change <= 0;

  return { avg30, change, changeGood, improving, firstT };
}
