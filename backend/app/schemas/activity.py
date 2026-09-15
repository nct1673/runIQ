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


class UploadResult(BaseModel):
    """Returned by POST /api/activities/upload -- raw-layer (activities_raw)
    stats only. Uploading does not populate `activities`."""

    raw_imported: int
    raw_skipped_duplicates: int


class GarminSyncResult(BaseModel):
    """Returned by POST /api/activities/sync-garmin -- raw-layer
    (activities_raw) stats only, same contract as UploadResult."""

    imported: int
    skipped_duplicates: int
    fetched: int
