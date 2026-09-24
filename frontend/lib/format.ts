/** Shared display formatting for run stats -- used by the dashboard,
 * activities list, and chart tooltips so pace/duration read identically
 * everywhere. */

export function formatPace(secPerKm: number | null | undefined): string {
  if (secPerKm == null) return "--";
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}/km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTotalDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "1:45:00" or "45:00" (h:mm:ss / m:ss, matching formatDuration's own
 * output) -> seconds. Returns null for empty/unparseable input, so a
 * caller can tell "no time entered" from "0 seconds". */
export function parseDurationInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p) || p < 0) || parts.length === 0 || parts.length > 3) return null;

  let seconds = 0;
  for (const part of parts) {
    seconds = seconds * 60 + part;
  }
  return seconds;
}
