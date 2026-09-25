/** Shared math for the dot-scatter + moving-average trend charts
 * (PaceTrendChart, MetricTrendChart) -- calendar-month helpers, a
 * trailing simple moving average, and Catmull-Rom cubic-bezier
 * smoothing so the trend line reads as a continuous curve. */

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function shiftMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short" });
}

/** Trailing simple moving average, window `n` (fewer points at the
 * start use however many are available, same convention as most
 * charting libraries' "MA5"). */
export function movingAverage(values: number[], n: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - n + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  });
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
