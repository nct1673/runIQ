"""Application settings, loaded from environment variables / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo-root .env, resolved absolutely -- ".env" alone only works when the
# process's CWD happens to be the repo root. Running `uvicorn` from
# `backend/` (the documented local-dev flow) has a CWD of `backend/`,
# which has no .env of its own, so a relative path silently found
# nothing and fell back to class defaults. Docker Compose is unaffected
# either way: it injects real env vars via `env_file:`, which
# pydantic-settings reads regardless of whether this file exists.
_REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_REPO_ROOT_ENV, extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg2://runiq:runiq@localhost:5432/runiq"

    # Single-user system (blueprint §4) -- every write attaches to this user.
    default_user_email: str = "owner@runiq.local"

    # External APIs (Module 1/2 -- Data Platform, Weather/AQ Intelligence)
    openweather_api_key: str | None = None
    google_air_quality_api_key: str | None = None

    # Garmin Connect (unofficial API via python-garminconnect)
    garmin_email: str | None = None
    garmin_password: str | None = None

    # AI Coach (Module 6)
    llm_provider: str = "anthropic"
    anthropic_api_key: str | None = None

    # Frontend
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
