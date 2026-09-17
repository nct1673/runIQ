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
    """Returned by POST /api/activities/sync-garmin -- raw-layer
    (activities_raw) stats only. Syncing does not populate `activities`."""

    imported: int
    skipped_duplicates: int
    fetched: int
