# RunIQ — Data Model

Implemented as SQLAlchemy models in `backend/app/models/`. This is the
conceptual view; exact column types/constraints live in code (source of
truth), and Alembic migrations track schema history.

## Entity overview

```
users
  ├─ activities_raw            (bronze layer: raw imported rows, pre-parsing/normalization)
  └─ activities  (source = "garmin_csv_upload" for now)
       ├─ activity_metrics     (derived: baseline delta, weather-adjusted pace, load contribution)
       └─ weather_conditions   (1:1 snapshot at time of activity)
  ├─ training_load             (rolling 7d/28d snapshots, not tied to one activity)
  ├─ predictions                (5K/10K/half-marathon, versioned by model)
  ├─ goals                      (target time + race date)
  └─ insights                   (AI Coach Q&A history + evidence, for audit)
```

## Tables

### `users`
Single row today; exists so multi-user isn't a future schema rewrite.
`id`, `email`, `created_at`.

### `activities_raw`
Bronze/landing-zone layer, one row per imported CSV row, **before** any
filtering or unit/type conversion — every original Garmin column is its
own `String` column (see `RAW_COLUMN_MAP` in
`app/models/activity_raw.py`), unlike `activities` which is unit-converted
and running-only. Also: `source_file`, `row_hash` (dedup key — sha1 of
the row's raw values, unique per `(user_id, row_hash)`), `imported_at`.

Populated by `app/ingestion/raw_loader.py` (`parse_raw` + `remove_duplicates`
+ `load`), called from the same `POST /api/activities/upload` request as
the processed pipeline — see `app/api/routes/activities.py`. Exists for
reprocessing and auditing when the normalization pipeline changes, or a
row gets rejected/filtered out downstream.

### `activities`
One row per imported run. `id`, `user_id`, `source`, `external_id` (dedup
key), `started_at`, `distance_km`, `duration_s`, `avg_pace_s_per_km`,
`avg_hr`, `avg_cadence`, `elevation_gain_m`, `activity_type`, `created_at`.

Exact Garmin CSV → column mapping lives in
`backend/app/ingestion/csv_parser.py`; finalize against the real export
headers (`~/Downloads/Activities.csv`) in Phase 1 — this table's columns
are the confirmed blueprint §5.1 fields, not yet verified against the raw
file.

### `activity_metrics`
One row per activity. `baseline_pace_delta_s_per_km`,
`weather_adjusted_pace_s_per_km`, `training_load_contribution`.

### `weather_conditions`
One row per activity (1:1), snapshotted at import/enrichment time so we
never need to re-query the historical weather API later (blueprint §6).

### `training_load`
Rolling snapshot, not tied to a single activity: `as_of_date`, `load_7d`,
`load_28d`, `fitness_score`, `fatigue_score`.

### `predictions`
`distance_label`, `predicted_time_s`, `range_low_s`, `range_high_s`,
`confidence`, `model_version`.

### `goals`
`distance_label`, `target_time_s`, `race_date`.

### `insights`
AI Coach history: `question`, `answer`, `evidence` (JSON-encoded), `source`
(sql | analytics | rag | mixed) — the audit trail backing blueprint §33's
"the AI should not fabricate evidence" requirement.
