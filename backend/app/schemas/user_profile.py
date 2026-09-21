"""Pydantic schemas for the user profile."""
from datetime import date

from pydantic import BaseModel


class UserProfileOut(BaseModel):
    display_name: str | None = None
    date_of_birth: date | None = None
    sex: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    resting_hr: int | None = None
    max_hr: int | None = None
    unit_system: str = "metric"
    timezone: str | None = None

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    """All fields optional -- PATCH semantics, only provided fields change."""

    display_name: str | None = None
    date_of_birth: date | None = None
    sex: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    resting_hr: int | None = None
    max_hr: int | None = None
    unit_system: str | None = None
    timezone: str | None = None
