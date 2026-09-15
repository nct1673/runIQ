# RunIQ — Roadmap

Adapted from blueprint §40-51. One deviation from the original blueprint:
**Phase 1's Garmin/Strava sync is manual CSV upload, not an API
integration** (we already have real export files; automated sync is
deferred).

## Phase 0 — Project Definition (2-3 days) — ✅ this scaffold
Freeze scope/architecture/stack. Deliverables: PRD, architecture doc, repo
skeleton, README, roadmap (this file).

## Phase 1 — Data Foundation (1 week)
Implement `app/ingestion/` against the real Garmin CSV headers, the
`/activities/upload` endpoint end-to-end, and load real historical runs
into Postgres. **Done when:** the real export can be reproducibly
processed via one pipeline call.

## Phase 2 — Weather & AQ Integration (1 week)
OpenWeather + Google Air Quality clients, matched to activity
timestamp/location, cached as snapshots. **Done when:** every eligible
activity has associated environmental data.

## Phase 3 — Analytics Engine (1-1.5 weeks)
Basic stats, trends, personal baseline, training volume/frequency,
similar-run engine, weather/AQI impact analysis. **Done when:** a reusable
analytics layer exists independent of the UI.

## Phase 4 — ML Intelligence (2 weeks)
Baselines → classical ML (ElasticNet/RF/XGBoost/LightGBM) for 5K/10K/half
prediction, time-series-safe validation, training-load & fitness/fatigue
indicators, weather-adjusted performance, SHAP explainability, MLflow
tracking.

## Phase 5 — Goal Intelligence (1 week)
Race goal creation, progress gap, trend estimation, training-focus
recommendations that explain themselves.

## Phase 6 — AI Running Coach (1.5-2 weeks)
Intent routing, SQL/analytics/RAG tools, response generation with
evidence/citations, hallucination evaluation. **Done when:** the AI can
answer real questions about the user's actual data with evidence.

## Phase 7 — Web Application (1-1.5 weeks)
Real dashboard/activities/analytics/predictions/goals/coach UI on top of
the Phase 0 Next.js scaffold.

## Phase 8 — Production Engineering (1 week)
CI/CD, migrations in CI, logging, error handling, deployment.

## Phase 9 — Monitoring & Documentation (3-5 days)
Architecture/data-pipeline/ML-methodology/RAG/API/deployment docs, model
drift + prediction-performance + RAG-quality monitoring.

## Phase 10 — Advanced Computer Vision (optional, 2-3 weeks)
Running Form Analysis via pose estimation — only after the core system is
stable. Explicitly not a blocker for the core project (blueprint §34).
