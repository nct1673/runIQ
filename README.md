# RunIQ

Personal running-intelligence platform — turns Garmin running history plus
weather data into a personalized understanding of performance,
via classical ML predictions and an evidence-grounded AI running coach.

Full product spec: [`RunIQ_Project_Blueprint.pdf`](./RunIQ_Project_Blueprint.pdf).
Architecture, PRD, data model, and roadmap: [`docs/`](./docs).

## Stack

- **Backend:** Python / FastAPI / SQLAlchemy / PostgreSQL (+pgvector)
- **ML:** scikit-learn, XGBoost/LightGBM, MLflow, SHAP
- **AI Coach:** LLM + SQL/RAG hybrid retrieval (provider-agnostic)
- **Frontend:** React / Next.js
- **Infra:** Docker Compose

## Getting started

### Backend (conda)

```bash
conda env create -f backend/environment.yml
conda activate runiq
cp .env.example .env   # fill in API keys
```

### Everything (Docker Compose)

```bash
docker compose up --build
```

- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000

### Database migrations

```bash
conda activate runiq
cd backend
alembic upgrade head
```

## Data collection (current, temporary)

There's no automated Garmin/Strava sync yet. Export your activity history
from Garmin Connect as CSV and upload it via the **Upload Activities**
page (`/activities/upload`) — the backend ingestion pipeline
(`backend/app/ingestion/`) parses, validates, and normalizes it into
Postgres. This is a deliberate placeholder: the ingestion functions are
transport-agnostic, so a scheduled Garmin/Strava API sync can call the
same functions later without changing them.

## Project status

Phase 0 (architecture scaffold) — see [`docs/roadmap.md`](./docs/roadmap.md)
for the full phased plan.
