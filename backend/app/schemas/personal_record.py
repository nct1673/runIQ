"""Pydantic response schema for the personal-records API."""
import uuid
from datetime import datetime

from pydantic import BaseModel


class PersonalRecordOut(BaseModel):
    id: uuid.UUID
    type_id: int
    label: str
    metric: str  # "time_s" | "distance_m"
    value: float
    garmin_activity_id: int | None = None
    activity_name: str | None = None
    achieved_at: datetime | None = None
    synced_at: datetime

    model_config = {"from_attributes": True}
