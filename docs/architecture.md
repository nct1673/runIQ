# RunIQ — System Architecture

## Data flow

```
Garmin CSV export (manual upload, temporary)
        │
        ▼
Frontend: /activities/upload  ──POST──▶  Backend: /api/activities/upload
        │
        ▼
app.ingestion (csv_parser → validators → normalizer)
        │
        ▼
PostgreSQL: activities, activity_metrics
        │
        ├──▶ Weather/AQ services (OpenWeather, Google AQ) ─▶ weather_conditions, air_quality
        │
        ▼
Analytics / Baseline / Similar-run / Training-load services
        │
        ▼
ML (features → models → predictions) ─▶ predictions
        │
        ▼
Goals service (target vs prediction) ─▶ goals
        │
        ▼
AI Coach (SQL + Analytics + RAG → LLM) ─▶ insights
        │
        ▼
Frontend dashboard / chat UI
```

This mirrors blueprint §39's proposed architecture, adapted for manual CSV
upload instead of a live Garmin/Strava API connection.

## Why manual upload first

The blueprint already treats "Strava API integration" as a future
enhancement (§8), and the user already has Garmin CSV exports on hand.
Rather than build an OAuth/API-sync integration before anything else
works, ingestion starts as a file upload. The architectural requirement
this imposes: **`app/ingestion/` must not know about HTTP** — it takes
bytes/DataFrames in, DataFrames out. `app/api/routes/activities.py` is
today's only caller; a future `app/jobs/strava_sync.py` (not built yet)
would be tomorrow's second caller of the exact same functions.

## Module → code mapping

| Blueprint module | Backend location |
|---|---|
| 1. Data Platform | `app/ingestion/`, `app/api/routes/activities.py` |
| 2. Running Analytics | `app/services/analytics_service.py`, `baseline_service.py`, `similar_run_service.py` |
| — Weather/AQ Intelligence | `app/services/weather_service.py`, `air_quality_service.py` |
| 3. Training Intelligence | `app/services/training_load_service.py` |
| 4. Performance Prediction | `app/ml/`, `app/services/prediction_service.py` |
| 5. Goals | `app/services/goal_service.py` |
| 6. AI Running Coach | `app/services/coach/` |
| 7. Running Form Analysis (optional) | not scaffolded yet — Phase 10 |

## AI Coach internal architecture (blueprint §30, §32)

```
User Question
   │
   ▼
Intent Detection (app/services/coach/router.py)
   │
   ├──▶ Structured  ──▶ sql_tool.py     ──▶ SQL result
   ├──▶ Analytical  ──▶ *_service.py    ──▶ analytics result
   └──▶ Knowledge   ──▶ rag_tool.py     ──▶ retrieved passages
   │
   ▼
llm_client.py (provider-agnostic)
   │
   ▼
Evidence-based answer (stored in `insights`)
```

Not every question hits vector search — structured/analytical questions
should use SQL/analytics directly (blueprint §32's key principle).

## Deployment (Docker Compose)

- `postgres` (pgvector-enabled image) — single source of truth
- `backend` (FastAPI) — all business logic; dev-mounts `backend/`
- `frontend` (Next.js) — dev-mounts `frontend/`

Local backend dev without Docker uses the conda env in
`backend/environment.yml` against either the Dockerized Postgres or a
locally installed one.

## Guiding principle

> Do not add a feature just because it uses AI. Every feature should
> answer a meaningful question for the runner.

Applies to every module above — see blueprint §60 for the full mapping of
module → question it answers.
