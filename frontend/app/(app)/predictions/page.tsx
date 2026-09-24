"use client";

import { useEffect, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";
import { formatDuration } from "@/lib/format";

interface Prediction {
  distance_label: string;
  predicted_time_s: number;
  range_low_s: number | null;
  range_high_s: number | null;
  confidence: string | null;
  model_version: string | null;
}

const DISTANCE_ORDER = ["5K", "10K", "half_marathon", "marathon"];
const DISTANCE_LABEL: Record<string, string> = {
  "5K": "5K",
  "10K": "10K",
  half_marathon: "Half Marathon",
  marathon: "Marathon",
};

/**
 * Blueprint §21-25: race-performance predictions with range + drivers.
 *
 * Currently backed by Garmin Connect's own race predictor (see
 * app/services/prediction_service.py) as a stopgap -- RunIQ's own model
 * (app/ml/) is still Phase 4, unbuilt. That's why there's no range,
 * confidence, or "Prediction Drivers" data yet: Garmin's predictor is a
 * black box that only hands back a single number per distance.
 */
export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/predictions")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setPredictions)
      .catch((err) => setError(err.message));
  }, []);

  const byDistance = new Map((predictions ?? []).map((p) => [p.distance_label, p]));

  return (
    <div>
      <Header title="Predictions" subtitle="5K / 10K / half-marathon / marathon, with uncertainty and explainability." />

      {error && <p className="mb-4 text-sm text-negative">Failed to load predictions: {error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DISTANCE_ORDER.map((label) => {
          const prediction = byDistance.get(label);
          return (
            <Card key={label} title={DISTANCE_LABEL[label]}>
              {!predictions && !error ? (
                <EmptyPlaceholder label="Loading..." />
              ) : prediction ? (
                <div>
                  <div className="text-3xl font-semibold text-text">{formatDuration(prediction.predicted_time_s)}</div>
                  <div className="mt-1 text-xs text-text-muted">
                    {prediction.model_version === "garmin_race_predictor" ? "Garmin's race predictor" : prediction.model_version}
                  </div>
                </div>
              ) : (
                <EmptyPlaceholder label="No prediction yet" />
              )}
            </Card>
          );
        })}
      </div>

      <Card title="Prediction Drivers" className="mt-4">
        <p className="text-sm text-text-muted">
          Not available from Garmin's predictor -- explainability needs RunIQ's own model (app/ml, blueprint §25), still to be built.
        </p>
      </Card>
    </div>
  );
}
