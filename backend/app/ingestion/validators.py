"""Validate one normalized+weather-enriched activity row before load
(blueprint SS8 "Data Validation": missing/invalid timestamps, invalid
distance/duration, unrealistic HR/cadence/weather).

Per-row, matching normalizer.py/processor.py -- pandera's batch/lazy
features matter less at N=1, but keeping the same declarative
`pa.DataFrameModel` approach (via a 1-row DataFrame) means the bounds
below stay the single source of truth even as the pipeline moved from a
DataFrame-batch shape to a per-row one.

Bounds are a starting point, not settled business rules -- adjust the
weather ones especially (drafted for Malaysia's climate; sanity-check
against docs/ipynb/raw_process.ipynb's actual fetched ranges).
"""
from __future__ import annotations

import pandas as pd
import pandera as pa
from pandera.typing import Series


class NormalizedActivitySchema(pa.DataFrameModel):
    distance_km: Series[float] = pa.Field(gt=0, le=200)
    duration_s: Series[float] = pa.Field(gt=0)
    avg_pace_s_per_km: Series[float] = pa.Field(gt=0, nullable=True)
    avg_hr: Series[float] = pa.Field(ge=30, le=230, nullable=True)
    avg_cadence: Series[float] = pa.Field(ge=60, le=260, nullable=True)
    elevation_gain_m: Series[float] = pa.Field(ge=0, nullable=True)

    # Weather is nullable throughout -- absent for treadmill runs (no GPS),
    # and processor.py should still load an activity whose weather lookup
    # failed/timed out rather than reject the whole row over it.
    temperature_c: Series[float] = pa.Field(ge=10, le=45, nullable=True)
    feels_like_c: Series[float] = pa.Field(ge=10, le=55, nullable=True)
    humidity_pct: Series[float] = pa.Field(ge=0, le=100, nullable=True)
    wind_speed_kmh: Series[float] = pa.Field(ge=0, le=150, nullable=True)
    precipitation_mm: Series[float] = pa.Field(ge=0, nullable=True)

    class Config:
        coerce = True


def validate_one(fields: dict) -> tuple[bool, str | None]:
    """`fields` is normalizer.normalize_one's output merged with
    weather_service.fetch_weather_snapshot's output (weather keys absent
    or None is fine). Returns (is_valid, rejection_reason).
    """
    if fields.get("started_at") is None or pd.isna(fields.get("started_at")):
        return False, "missing/invalid timestamp"

    df = pd.DataFrame([fields])
    try:
        NormalizedActivitySchema.validate(df, lazy=True)
        return True, None
    except pa.errors.SchemaErrors as err:
        case = err.failure_cases.iloc[0]
        return False, f"{case['column']} failed '{case['check']}' (value={case['failure_case']})"
