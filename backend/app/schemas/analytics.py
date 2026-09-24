"""Pydantic response schemas for the analytics API."""
from datetime import date, datetime

from pydantic import BaseModel


class SummaryOut(BaseModel):
    total_runs: int
    total_distance_km: float
    total_duration_s: float
    avg_pace_s_per_km: float | None
    # Trailing-7-day distance vs the 7 days before that, as a percentage
    # (e.g. 12.5 == +12.5%). None until there's a prior week to compare
    # against.
    distance_delta_pct: float | None


class WeeklyMileagePoint(BaseModel):
    week_start: date
    distance_km: float
    runs: int


class MonthlyMileagePoint(BaseModel):
    month_start: date
    distance_km: float
    runs: int


class PaceTrendPoint(BaseModel):
    activity_id: str
    started_at: datetime
    avg_pace_s_per_km: float
    distance_km: float


class TypeSplitEntry(BaseModel):
    activity_type: str
    runs: int
    distance_km: float
