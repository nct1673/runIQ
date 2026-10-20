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


# --- Weather & conditions (app.services.weather_impact_service) -------------


class WeatherRunPoint(BaseModel):
    activity_id: str
    started_at: datetime
    hour: float  # local start time, 0-24
    feels_like_c: float
    temperature_c: float | None = None
    pace_s_per_km: float
    avg_hr: float | None = None
    distance_km: float
    easy: bool  # mostly Zone 1-2 and 3-15 km
    same_effort_pace_s_per_km: float | None = None  # pace at the reference heart rate
    heat_adjusted_pace_s_per_km: float | None = None  # pace at the reference feels-like


class HeatModel(BaseModel):
    heat_s_per_km_per_c: float  # extra s/km per +1 degC feels-like, same heart rate
    heat_se: float
    ci_low: float  # 95% interval
    ci_high: float
    hr_s_per_km_per_bpm: float
    r2: float
    n: int
    confidence: str  # "high" | "moderate" | "low"
    feels_like_min: float
    feels_like_max: float
    mean_feels_like_c: float
    mean_same_effort_pace_s_per_km: float


class MonthlyHeatCost(BaseModel):
    month: date
    runs: int
    spread_c: float | None = None
    slope_s_per_km_per_c: float | None = None
    se: float | None = None
    reliable: bool
    reason: str | None = None


class HeatCostChange(BaseModel):
    from_month: date
    to_month: date
    from_value: float
    to_value: float
    pct_change: float
    confidence: str  # "ok" | "low" (a monthly slope is within ~2 standard errors of zero)


class WeeklyAdjustedPoint(BaseModel):
    week_start: date
    runs: int
    actual_pace_s_per_km: float
    adjusted_pace_s_per_km: float


class AdjustedSummary(BaseModel):
    from_month: date
    to_month: date
    actual_from: float
    actual_to: float
    adjusted_from: float
    adjusted_to: float
    weather_share_s: float


class WeatherImpactOut(BaseModel):
    months: int
    reference_hr_bpm: float
    reference_feels_like_c: float
    outdoor_runs: int
    easy_runs: int
    model: HeatModel | None = None
    model_unavailable_reason: str | None = None
    runs: list[WeatherRunPoint]
    monthly: list[MonthlyHeatCost]
    heat_cost_change: HeatCostChange | None = None
    weekly: list[WeeklyAdjustedPoint]
    adjusted_summary: AdjustedSummary | None = None
