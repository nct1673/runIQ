# RunIQ

Personal running-intelligence platform — turns Garmin running history plus
weather data into a personalized understanding of performance, via trend
analytics, pose-based running-form analysis, and an evidence-grounded AI
running coach.

Full product spec: [`RunIQ_Project_Blueprint.pdf`](./RunIQ_Project_Blueprint.pdf).
Architecture, PRD, data model, and roadmap: [`docs/`](./docs).

## Stack

- **Backend:** Python / FastAPI / SQLAlchemy / PostgreSQL (+pgvector)
- **Running Form Analysis:** MediaPipe pose estimation + OpenCV
- **AI Coach:** LLM + SQL/RAG hybrid retrieval (provider-agnostic)
- **Frontend:** React / Next.js
- **Infra:** Docker Compose

## Quick start (Docker)

Requires Docker with Compose v2.24+.

```bash
git clone <this repo> && cd runIQ
cp .env.example .env        # then set AUTH_PASSWORD (the password you log in with)
docker compose up -d
```

Open http://localhost:3000 and log in with the email in `DEFAULT_USER_EMAIL`
(default `owner@runiq.local`) and your `AUTH_PASSWORD`. The first start builds
the images, which takes a few minutes.

- Everything is bound to `localhost` only; Postgres and the backend are not
  published. Change the port with `RUNIQ_PORT` in `.env`.
- Database migrations run automatically on every start. The session secret and
  coach database password are generated on first start and kept in the
  `backend_data` volume.
- `AUTH_PASSWORD` is only read on the very first start (it's hashed into the
  database). Change it afterwards from inside the app. To start over from
  scratch: `docker compose down -v` (this deletes your data).
- Your data lives in Docker volumes (`postgres_data`, `backend_data`), so it
  survives `docker compose down` and upgrades.

### AI Coach

The coach is optional. Pick one:

- **Gemini:** set `GEMINI_API_KEY` in `.env` (`LLM_PROVIDER=gemini`).
- **Local Ollama:** `docker compose --profile ollama up -d`. This also provides
  the embedding model the coach's knowledge search needs, and pulls the chat
  model if you set `LLM_PROVIDER=ollama` (large; wants a GPU). Already running
  Ollama on your host? Set `OLLAMA_URL=http://host.docker.internal:11434`
  instead.

Load the coaching knowledge base once the embedding model is available:

```bash
docker compose exec backend python scripts/ingest_knowledge.py
```

### Development (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This bind-mounts the source, runs `uvicorn --reload` and `next dev`, and also
publishes Postgres (5432) and the backend (8000) on your machine.

## Running without Docker

### Backend (conda)

```bash
conda env create -f backend/environment.yml
conda activate runiq
cp .env.example .env   # uncomment and fill the "outside Docker" values
cd backend && alembic upgrade head
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
