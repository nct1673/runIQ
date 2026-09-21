"""Pydantic request/response schemas for the activities API."""
import uuid
from datetime import datetime

from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: uuid.UUID
    started_at: datetime
    distance_km: float
    duration_s: float
    avg_pace_s_per_km: float | None = None
    avg_hr: float | None = None
    avg_cadence: float | None = None
    elevation_gain_m: float | None = None
    activity_type: str | None = None

    model_config = {"from_attributes": True}


class GarminSyncResult(BaseModel):
    """Returned by POST /api/activities/sync-garmin. Covers both stages
    that route now runs: the raw Garmin pull (activities_raw) and the
    raw-to-processed pipeline (activities/weather_conditions) that runs
    immediately after it -- see app.ingestion.processor.
    """

    # Stage 1: raw pull (garmin_api_loader)
    fetched: int
    imported: int
    skipped_duplicates: int

    # Stage 2: raw-to-processed pipeline (processor.process_new_activities)
    processed: int
    skipped_non_running: int
    weather_matched: int
    rejected: int
    rejection_reasons: list[str]
