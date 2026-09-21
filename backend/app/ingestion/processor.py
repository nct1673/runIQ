"""Orchestrates the raw-to-processed pipeline: normalize -> fetch weather
-> validate -> load, run once per unprocessed `activities_raw` row.

This is the one place the per-row loop lives (see normalizer.py's
docstring) -- normalize_one/fetch_weather_snapshot/validate_one/load_one
all handle exactly one activity and know nothing about batching. Only
rows without a matching `activities` row yet are processed, so a sync
that finds no new Garmin activities does zero weather-API calls.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ingestion import loader, normalizer, validators
from app.models.activity import Activity
from app.models.activity_raw import ActivityRaw
from app.services import weather_service

# Same pacing as docs/ipynb/raw_process.ipynb's weather-fetch loop --
# kept deliberately even though this now runs inside a request/response
# cycle (per project decision): a sync large enough to cross 50 new
# activities is rare (first-ever sync / a big backfill), and correctness
# against OpenWeather's rate limit matters more than that request's
# latency in those cases.
THROTTLE_EVERY = 50
THROTTLE_SECONDS = 60

# Always merged into `fields` before validation, even when no weather was
# found -- validators.NormalizedActivitySchema's `nullable=True` only
# tolerates a None *value* in a column that exists; a key missing
# entirely (e.g. from `weather = {}`) fails pandera's column_in_dataframe
# check instead of being treated as null.
WEATHER_FIELD_DEFAULTS = dict.fromkeys(
    ["temperature_c", "feels_like_c", "humidity_pct", "wind_speed_kmh", "precipitation_mm", "condition"]
)


@dataclass
class ProcessResult:
    processed: int = 0
    skipped_non_running: int = 0
    weather_matched: int = 0
    rejected: int = 0
    rejection_reasons: list[str] = field(default_factory=list)


def _unprocessed_raw_rows(db: Session, user_id: uuid.UUID) -> list[ActivityRaw]:
    """`activities_raw` rows for this user with no matching `activities`
    row yet, matched by external_id == str(garmin_activity_id) (see
    normalizer.normalize_one)."""
    processed_ids = set(
        db.scalars(select(Activity.external_id).where(Activity.user_id == user_id))
    )
    raw_rows = db.scalars(
        select(ActivityRaw).where(ActivityRaw.user_id == user_id)
    ).all()
    return [r for r in raw_rows if str(r.garmin_activity_id) not in processed_ids]


def process_new_activities(db: Session, user_id: uuid.UUID) -> ProcessResult:
    result = ProcessResult()
    weather_call_count = 0

    for raw in _unprocessed_raw_rows(db, user_id):
        normalized = normalizer.normalize_one(raw)
        if normalized is None:
            result.skipped_non_running += 1
            continue

        weather: dict = {}
        if raw.api_start_latitude is not None and raw.api_start_longitude is not None:
            if weather_call_count > 0 and weather_call_count % THROTTLE_EVERY == 0:
                time.sleep(THROTTLE_SECONDS)
            weather = weather_service.fetch_weather_snapshot(
                raw.api_start_latitude,
                raw.api_start_longitude,
                int(normalized["started_at"].timestamp()),
            ) or {}
            weather_call_count += 1
            if weather:
                result.weather_matched += 1

        fields = {**normalized, **WEATHER_FIELD_DEFAULTS, **weather}
        is_valid, reason = validators.validate_one(fields)
        if not is_valid:
            result.rejected += 1
            result.rejection_reasons.append(f"garmin_activity_id={raw.garmin_activity_id}: {reason}")
            continue

        loader.load_one(db, user_id, fields)
        result.processed += 1

    db.commit()
    return result
