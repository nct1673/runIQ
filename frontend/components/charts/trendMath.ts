/** Shared math for the dot-scatter trend charts (PaceTrendChart,
 * MetricTrendChart) -- calendar-month helpers, an ordinary-least-squares
 * line fit, and Catmull-Rom cubic-bezier smoothing (also doubles as a
 * straight-line path for exactly 2 points, which is all the regression
 * line ever passes it). */

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function shiftMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short" });
}

/** Ordinary-least-squares line through `pts`, returned as its two
 * endpoints at pts' min/max x -- feed straight into smoothPath (or any
 * 2-point path builder) for a straight trend line. Computed directly in
 * whatever coordinate space `pts` is already in (e.g. pixel space),
 * which is valid since a linear fit commutes with the linear x/y-value
 * -> pixel scaling the caller already applied. */
export function linearRegressionLine(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return [pts[0], pts[0]];

  const n = pts.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of pts) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const xs = pts.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept },
  ];
}

function niceNumber(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

/** "Nice" evenly-spaced y-axis tick values spanning at least [min, max]
 * (classic Sparks/Heckbert nice-numbers algorithm) -- round steps like
 * 5/10/25/50 instead of whatever the raw data range happens to divide
 * into. Returns the ticks low-to-high; the caller extends its own
 * plotted domain to [ticks[0], ticks[last]] so gridlines/dots agree. */
export function niceTicks(min: number, max: number, targetCount = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / Math.max(targetCount - 1, 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Number(v.toFixed(10))); // clear float noise like 8.799999999999999
  }
  return ticks;
}

/** Catmull-Rom-derived cubic-bezier smoothing through `pts`, in SVG path
 * syntax -- gives the moving-average line a continuous curve instead of
 * straight segments. */
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
