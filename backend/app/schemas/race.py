"""Pydantic request/response schemas for the races API."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel


class RaceCreate(BaseModel):
    name: str
    distance_km: float
    race_date: date
    location: str | None = None
    notes: str | None = None
    goal_time_s: float | None = None
    priority: str | None = None  # "A" | "B" | "C"


class RaceUpdate(BaseModel):
    """All fields optional -- only the ones present in the request body
    are applied (see race_service.update_race). Covers both editing an
    upcoming race and marking one completed (status="completed" +
    actual_time_s)."""

    name: str | None = None
    distance_km: float | None = None
    race_date: date | None = None
    location: str | None = None
    notes: str | None = None
    goal_time_s: float | None = None
    priority: str | None = None
    status: str | None = None  # "upcoming" | "completed"
    actual_time_s: float | None = None


class RaceOut(BaseModel):
    id: uuid.UUID
    name: str
    distance_km: float
    race_date: date
    location: str | None = None
    notes: str | None = None
    goal_time_s: float | None = None
    priority: str | None = None
    status: str
    actual_time_s: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
