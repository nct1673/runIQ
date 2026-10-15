"use client";

import { useEffect, useState } from "react";

import { EmptyPlaceholder, InfoTip } from "@/components/Card";
import { TrophyIcon } from "@/components/icons";
import { formatDuration } from "@/lib/format";

interface PersonalRecord {
  id: string;
  type_id: number;
  label: string;
  metric: "time_s" | "distance_m";
  value: number;
  garmin_activity_id: number | null;
  activity_name: string | null;
  achieved_at: string | null;
  synced_at: string;
}

function formatValue(record: PersonalRecord): string {
  if (record.metric === "time_s") return formatDuration(record.value);
  return `${(record.value / 1000).toFixed(2)} km`;
}

function formatAchievedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Race distance per PR type_id, matching
// app/ingestion/garmin_personal_records_loader.py's KNOWN_TYPES exactly.
// type_id 7 (Longest Run) is deliberately absent -- it's a distance_m
// metric, not a timed effort, so it has no VDOT.
const VDOT_DISTANCE_M: Record<number, number> = {
  1: 1000, // 1 km
  2: 1609.34, // 1 mile
  3: 5000, // 5 km
  4: 10000, // 10 km
  5: 21097.5, // Half Marathon
  6: 42195, // Marathon
};

/** Jack Daniels' VDOT -- a race performance's equivalent VO2max, from
 * Daniels' Running Formula (the standard published formula, not a
 * RunIQ-specific computation). `timeS`/`distanceM` must be a single
 * all-out effort (a PR fits; a training run's average pace doesn't). */
function vdotScore(distanceM: number, timeS: number): number {
  const velocity = distanceM / (timeS / 60); // meters per minute
  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;

  const timeMin = timeS / 60;
  const percentMax =
    0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 0.2989558 * Math.exp(-0.1932605 * timeMin);

  return vo2 / percentMax;
}

function vdotFor(record: PersonalRecord): number | null {
  if (record.metric !== "time_s") return null;
  const distanceM = VDOT_DISTANCE_M[record.type_id];
  if (distanceM == null) return null;
  return vdotScore(distanceM, record.value);
}

/**
 * Garmin-tracked personal bests (blueprint-adjacent: not in the original
 * spec, added on request). Synced into `personal_records` via
 * POST /api/personal-records/sync (app.services.personal_record_service)
 * rather than computed from `activities` -- Garmin already tracks these
 * against its full history, which may predate what's synced locally.
 *
 * No sync button of its own -- the dashboard's "Update Data" triggers
 * the sync (alongside the activities sync); this card just re-fetches
 * whenever `refreshKey` changes, or once on mount if that prop isn't
 * passed (e.g. on /analytics, where it's just a display).
 */
export default function PersonalRecordsCard({ refreshKey }: { refreshKey?: number | string }) {
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/personal-records")
      .then((res) => (res.ok ? res.json() : null))
      .then(setRecords)
      .catch(() => setRecords(null));
  }, [refreshKey]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-muted">Personal Records</h3>
        <InfoTip>
          <div className="space-y-2">
            <p className="font-semibold text-text-muted">VDOT score</p>
            <p>
              A fitness number from Jack Daniels' running formula. It converts a race time into the VO2max (how much
              oxygen your body can use) that would produce it.
            </p>
            <p>
              Because it adjusts for distance, you can compare a 5 km and a marathon on the same scale. Higher means
              fitter, and a big gap between distances shows where you're relatively weaker.
            </p>
            <p>
              Each score assumes an all-out effort at that distance. Longest Run has no score since it isn't a timed
              race.
            </p>
          </div>
        </InfoTip>
      </div>

      {!records ? (
        <EmptyPlaceholder label="Loading..." />
      ) : records.length === 0 ? (
        <EmptyPlaceholder label='No records yet -- press "Update Data" to pull your PBs.' />
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-4 pb-2 text-[10px] uppercase tracking-wide text-text-muted">
            <div className="flex-1">Record</div>
            <div className="w-24 shrink-0 text-right">Time</div>
            <div className="w-16 shrink-0 text-right">VDOT Score</div>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {records.map((r) => {
              const vdot = vdotFor(r);
              return (
                <div key={r.id} className="flex items-center gap-4 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <TrophyIcon className="h-3.5 w-3.5 shrink-0 text-stat-distance" />
                    <span className="truncate text-sm text-text-muted">{r.label}</span>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <div className="text-sm font-semibold text-text">{formatValue(r)}</div>
                    {(r.activity_name || r.achieved_at) && (
                      <div className="truncate text-[10px] text-text-muted" title={r.activity_name ?? undefined}>
                        {formatAchievedAt(r.achieved_at)}
                      </div>
                    )}
                  </div>
                  <div className="w-16 shrink-0 text-right text-sm font-semibold">
                    {vdot != null ? <span className="text-brand">{vdot.toFixed(1)}</span> : <span className="text-text-muted">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
