"""Pydantic request/response schemas for the planned-runs API."""
import uuid
from datetime import date

from pydantic import BaseModel, Field


class PlannedRunCreate(BaseModel):
    planned_date: date
    run_type: str
    distance_km: float = Field(gt=0, le=500)


class PlannedRunUpdate(BaseModel):
    run_type: str | None = None
    distance_km: float | None = Field(default=None, gt=0, le=500)


class PlannedRunOut(BaseModel):
    id: uuid.UUID
    planned_date: date
    run_type: str
    distance_km: float

    model_config = {"from_attributes": True}
