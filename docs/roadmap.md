# RunIQ — Roadmap

Tracked against the blueprint's own module numbering (§7-37), not the
original Phase 0-10 plan this file used to follow -- that phase plan
bundled Module 3 and Module 4 together under one "ML Intelligence" phase,
which stopped matching how scope decisions actually get made module by
module. See `RunIQ_Project_Blueprint.pdf` for full detail per module.

## Module 1 — Data Platform — ✅ Done
Garmin API sync (`app/ingestion/garmin_api_loader.py`), not CSV/GPX/FIT
import as originally specced -- deliberate pivot once Garmin API access
was available; the CSV upload path was built first, then retired.
Validation, normalization, PostgreSQL storage all real and working.

## Module 2 — Running Analytics — ✅ Done (core)
Basic stats + trend charts (§10-11) and Weather Intelligence (§14) are
fully built, live on `/dashboard` and `/analytics`. **Marked done as of
2026-10-14; the following sub-features from this module were not built
and are not currently planned:**
- Personal Baseline (§12) / Similar-Run Engine (§13) — exist only as
  lightweight tools inside the AI Coach's tool-calling layer (chat
  answers), not as dedicated UI.
- Personal Weather Profile (§15) / Weather-Adjusted Performance (§16) —
  not started.
- Air Quality Intelligence (§17) — not started, no AQI data source.

## Module 3 — Training Intelligence — ✅ Done (descoped)
Training Load (§18), Fitness vs. Fatigue (§19), and Training Timeline
(§20) as specced were not built — `training_load_service.py` is still a
stub, no training-load UI exists. **Marked done/descoped as of
2026-10-14**: not currently planned to be built as originally specced.

## Module 4 — Performance Prediction — ❌ Removed (2026-10-14)
Was: classical ML (ElasticNet/Random Forest/XGBoost/LightGBM) predicting
5K/10K/half-marathon race times from training features, time-series-safe
validation, SHAP explainability (§21-25). `app/ml/` only ever held
one-line `NotImplementedError` stubs — nothing built, nothing lost by
cutting it.

**Replacement — pending redesign.** The user wants to redesign this
module as a **race tracking system** instead of an ML prediction model.
Not yet scoped/designed. **Remind the user about this next time Module 4
or race predictions come up**, so the redesign actually gets picked back
up instead of silently staying cut.

## Module 5 — Goals — ✅ Done (reshaped)
Not built as specced (goal creation + week-by-week gap/trend tracking
against an ML prediction). Instead became the **Race module**: race CRUD,
goal time vs. actual, race history, calendar markers, countdown on
`/race` + `/dashboard`. Covers race management; does not do the
blueprint's progress-over-time gap tracking (that depended on Module 4's
predictions, which no longer exist).

## Module 6 — AI Running Coach — ✅ Done
Intent-routed tool-calling (`app/services/coach/router.py`) over SQL
analytics tools + RAG retrieval, via Ollama. SQL-grounded answers
verified working end-to-end on `/coach`. RAG retrieval is real pgvector
search, but `backend/knowledge/` has no content files yet — nothing to
retrieve until that's populated.

## Running Form Analysis — ✅ Done (optional extension, §34-37)
Explicitly optional / "not a blocker for the core project" in the
blueprint. MediaPipe pose pipeline (`app/services/pose/`) extracts
landmarks, detects touchdown/midstance, computes shank angle, overstride,
knee flexion, trunk lean, arm swing; runs as a background task from
`/video-analysis`. Further along than several core modules.

## Beyond the blueprint
Garmin Personal Records sync, race-time/distance-dropdown UX, calendar
race markers, trend-line direction-coloring + delta badges, Coach
conversation delete, and general dashboard/analytics layout rework --
none of this was in the original blueprint; all added on request.
