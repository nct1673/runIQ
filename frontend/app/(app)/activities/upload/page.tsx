"use client";

import { useState } from "react";

import Card from "@/components/Card";
import Header from "@/components/Header";
import { RefreshIcon } from "@/components/icons";

/**
 * Data-collection path: pulls directly from the Garmin Connect API
 * (via python-garminconnect, server-side) and stores every activity in
 * `activities_raw` (source="garmin_api"), deduplicated by Garmin's own
 * activity ID. No parsing/normalization happens here -- see
 * backend/app/ingestion/garmin_api_loader.py.
 *
 * The manual CSV-upload path (POST /api/activities/upload) still exists
 * server-side but isn't linked from this page anymore.
 */
export default function UpdateDataPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setStatus("Fetching from Garmin...");

    try {
      const res = await fetch("/api/activities/sync-garmin", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setStatus(
        `Fetched ${result.fetched}: ${result.imported} new row(s) stored, ` +
          `${result.skipped_duplicates} duplicate(s) skipped.`
      );
    } catch (err) {
      setStatus(`Update failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Update Data" subtitle="Pull your latest activities from Garmin Connect." />
      <Card className="max-w-xl">
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshIcon className="h-4 w-4" />
          {loading ? "Updating..." : "Update Data"}
        </button>
        {status && <p className="mt-4 text-sm text-text-muted">{status}</p>}
      </Card>
    </div>
  );
}
