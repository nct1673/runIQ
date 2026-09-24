"""Normalize one raw Garmin-API activity row into the fields
`app.models.Activity` expects (blueprint SS8 "Data Normalization").

Per-row, not DataFrame-batch: `app.ingestion.processor` calls this once
per unprocessed `ActivityRaw`, so a bad/unusual row never risks
misaligning a shared results list the way a single big pandas pass over
the whole table could. Only "running" and "treadmill_running" are
running-intelligence relevant (project decision) -- everything else is
reported back as skipped, never stored.
"""
from __future__ import annotations

import math
from datetime import datetime

import pytz

from app.models.activity_raw import ActivityRaw

RUNNING_ACTIVITY_TYPES = {"running", "treadmill_running"}

# Same assumption docs/ipynb/raw_process.ipynb's myt2unix made: every
# api_start_time_local is a wall-clock reading in this timezone. True
# while every run is logged from Malaysia; revisit if that ever changes
# (there's no per-activity timezone field on ActivityRaw to fall back on).
ACTIVITY_TIMEZONE = pytz.timezone("Asia/Kuala_Lumpur")


def _location(activity_name: str | None) -> str | None:
    """Ported from raw_process.ipynb cell 3: "Kuala Lumpur Running" ->
    "Kuala Lumpur", "Shah Alam Running - evening" -> "Shah Alam"."""
    if not activity_name:
        return None
    stripped = activity_name.replace("Running", "").strip()
    return stripped.split("-")[0].strip() or None


def _pace_mm_ss(duration_s: float, distance_km: float) -> str | None:
    """Ported from raw_process.ipynb cell 4's pace_mm/mm/ss round-trip --
    a display string, kept alongside the precise avg_pace_s_per_km
    (which this function does NOT feed; see normalize_one's docstring)."""
    if not distance_km:
        return None
    pace_mm_total = (duration_s / 60) / distance_km
    mm = math.floor(pace_mm_total)
    ss = math.floor((pace_mm_total - mm) * 60)
    return f"{mm}:{ss:02d}"


def normalize_one(raw: ActivityRaw) -> dict | None:
    """Returns a dict with keys matching `app.models.Activity`, or None if
    `raw` isn't a running activity and should be skipped.

    Ported from docs/ipynb/raw_process.ipynb cells 1-5 and the "Finalize
    Processing" column mapping, with two changes:
      - avg_pace_s_per_km is computed directly (duration / (distance/1000))
        instead of the notebook's floor(mm)/floor(ss) round-trip, which
        only ever fed a display string and threw away sub-second precision
        doing it. That display string is still produced separately, as
        `pace` (see _pace_mm_ss), matching the notebook's final df.
      - weather_* is NOT ported here -- app.services.weather_service +
        app.models.weather.WeatherCondition is the real weather path
        (per-row, called from processor.py), not this function.

    `external_id`: `str(raw.garmin_activity_id)` -- already a real,
    stable, unique ID from Garmin, no need for the hash-based scheme the
    old CSV-era version of this file used.

    `started_at` is localized to ACTIVITY_TIMEZONE (not left naive) so
    `int(started_at.timestamp())` -- what processor.py passes to
    weather_service.fetch_weather_snapshot -- is the correct Unix
    timestamp for this activity's actual moment, regardless of what
    timezone the server process itself happens to run in.
    """
    if raw.api_activity_type not in RUNNING_ACTIVITY_TYPES:
        return None

    if raw.api_distance is None or raw.api_duration is None or not raw.api_start_time_local:
        return None

    started_at = ACTIVITY_TIMEZONE.localize(
        datetime.strptime(raw.api_start_time_local, "%Y-%m-%d %H:%M:%S")
    )
    distance_km = raw.api_distance / 1000

    return {
        "external_id": str(raw.garmin_activity_id),
        "started_at": started_at,
        "distance_km": distance_km,
        "duration_s": raw.api_duration,
        "avg_pace_s_per_km": raw.api_duration / distance_km if distance_km else None,
        "avg_hr": raw.api_average_hr,
        "avg_cadence": raw.api_average_running_cadence,
        "elevation_gain_m": raw.api_elevation_gain,
        "activity_type": raw.api_activity_type,
        # -- Widened fields (see app.models.Activity) --
        "raw_imported_at": raw.imported_at,
        "activity_name": raw.api_activity_name,
        "event_type": raw.api_event_type,
        "elapsed_duration_s": raw.api_elapsed_duration,
        "moving_duration_s": raw.api_moving_duration,
        "calories": raw.api_calories,
        "avg_power": raw.api_avg_power,
        "norm_power": raw.api_norm_power,
        "avg_stride_length": raw.api_avg_stride_length,
        "avg_vertical_oscillation": raw.api_avg_vertical_oscillation,
        "avg_vertical_ratio": raw.api_avg_vertical_ratio,
        "avg_ground_contact_time": raw.api_avg_ground_contact_time,
        "start_latitude": raw.api_start_latitude,
        "start_longitude": raw.api_start_longitude,
        "training_effect_label": raw.api_training_effect_label,
        "vo2_max": raw.api_v_o2_max_value,
        "hr_time_in_zone_1": raw.api_hr_time_in_zone_1,
        "hr_time_in_zone_2": raw.api_hr_time_in_zone_2,
        "hr_time_in_zone_3": raw.api_hr_time_in_zone_3,
        "hr_time_in_zone_4": raw.api_hr_time_in_zone_4,
        "hr_time_in_zone_5": raw.api_hr_time_in_zone_5,
        "power_time_in_zone_1": raw.api_power_time_in_zone_1,
        "power_time_in_zone_2": raw.api_power_time_in_zone_2,
        "power_time_in_zone_3": raw.api_power_time_in_zone_3,
        "power_time_in_zone_4": raw.api_power_time_in_zone_4,
        "power_time_in_zone_5": raw.api_power_time_in_zone_5,
        "location": _location(raw.api_activity_name),
        "pace": _pace_mm_ss(raw.api_duration, distance_km),
    }
