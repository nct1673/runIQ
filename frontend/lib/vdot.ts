/** Jack Daniels' VDOT -- a race performance's equivalent VO2max, from
 * Daniels' Running Formula (standard published formula). `timeS` /
 * `distanceM` must be a single all-out effort. */
export function vdotScore(distanceM: number, timeS: number): number {
  const velocity = distanceM / (timeS / 60); // meters per minute
  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;

  const timeMin = timeS / 60;
  const percentMax =
    0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 0.2989558 * Math.exp(-0.1932605 * timeMin);

  return vo2 / percentMax;
}

/** Race time (s) at `distanceM` that a given VDOT is equivalent to --
 * vdotScore is strictly decreasing in time, so bisect on it. */
export function equivalentTimeS(vdot: number, distanceM: number): number {
  let lo = 60;
  let hi = 86_400;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotScore(distanceM, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
