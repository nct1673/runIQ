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
    # Most recent Garmin-estimated vo2_max reading, and its change vs the
    # latest reading from 7+ days ago. Both None until there's data.
    vo2_max: float | None
    vo2max_delta_pct: float | None


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
    activity_type: str | None = None


class BiomechanicsTrendPoint(BaseModel):
    activity_id: str
    started_at: datetime
    distance_km: float
    activity_type: str | None = None
    avg_cadence: float | None = None
    avg_stride_length: float | None = None
    avg_vertical_oscillation: float | None = None
    avg_vertical_ratio: float | None = None
    avg_ground_contact_time: float | None = None
    avg_hr: float | None = None
    avg_power: float | None = None
    norm_power: float | None = None
    elevation_gain_m: float | None = None
    calories: float | None = None
    temperature_c: float | None = None
    humidity_pct: float | None = None


class TypeSplitEntry(BaseModel):
    activity_type: str
    runs: int
    distance_km: float
