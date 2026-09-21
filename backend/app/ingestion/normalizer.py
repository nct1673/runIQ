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

from datetime import datetime

import pytz

from app.models.activity_raw import ActivityRaw

RUNNING_ACTIVITY_TYPES = {"running", "treadmill_running"}

# Same assumption docs/ipynb/raw_process.ipynb's myt2unix made: every
# api_start_time_local is a wall-clock reading in this timezone. True
# while every run is logged from Malaysia; revisit if that ever changes
# (there's no per-activity timezone field on ActivityRaw to fall back on).
ACTIVITY_TIMEZONE = pytz.timezone("Asia/Kuala_Lumpur")


def normalize_one(raw: ActivityRaw) -> dict | None:
    """Returns a dict with keys matching `app.models.Activity`
    (distance_km, duration_s, avg_pace_s_per_km, avg_hr, avg_cadence,
    elevation_gain_m, activity_type, started_at, external_id), or None if
    `raw` isn't a running activity and should be skipped.

    Ported from docs/ipynb/raw_process.ipynb cells 1-5 and the "Finalize
    Processing" column mapping, with one change: avg_pace_s_per_km is
    computed directly (duration / (distance/1000)) instead of the
    notebook's floor(mm)/floor(ss) round-trip, which only ever fed a
    display string and threw away sub-second precision doing it.

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
    }
