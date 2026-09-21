"""Insert one validated, normalized+weather-enriched activity into
Postgres -- `activities` plus, when weather was matched, the linked
`weather_conditions` row. Per-row (see normalizer.py/processor.py);
deliberately the only module in `app.ingestion` that touches the
database.
"""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.weather import WeatherCondition

WEATHER_FIELDS = {"temperature_c", "feels_like_c", "humidity_pct", "wind_speed_kmh", "precipitation_mm", "condition"}


def load_one(db: Session, user_id: uuid.UUID, fields: dict) -> Activity:
    """`fields` is normalizer.normalize_one's output merged with
    weather_service.fetch_weather_snapshot's output (already validated by
    validators.validate_one). Does not commit -- the caller (processor.py)
    commits once per batch so a mid-run failure doesn't leave a half
    -committed activity without its weather row.
    """
    # started_at arrives timezone-aware (normalizer.py localizes it, so
    # processor.py can derive a correct Unix timestamp for the weather
    # lookup) -- but Activity.started_at is a plain DateTime column with
    # no timezone awareness of its own, so passing a tz-aware value
    # through as-is gets silently converted to UTC on the way into
    # Postgres, corrupting the wall-clock time (and sometimes the
    # calendar date) it's supposed to represent. Store the naive local
    # wall-clock value instead, matching Garmin's own display.
    started_at = fields["started_at"]
    if started_at.tzinfo is not None:
        started_at = started_at.replace(tzinfo=None)

    activity = Activity(
        user_id=user_id,
        source="garmin_api",
        external_id=fields["external_id"],
        started_at=started_at,
        distance_km=fields["distance_km"],
        duration_s=fields["duration_s"],
        avg_pace_s_per_km=fields.get("avg_pace_s_per_km"),
        avg_hr=fields.get("avg_hr"),
        avg_cadence=fields.get("avg_cadence"),
        elevation_gain_m=fields.get("elevation_gain_m"),
        activity_type=fields.get("activity_type"),
    )
    db.add(activity)
    db.flush()  # populate activity.id before it's used as a FK below

    if any(fields.get(k) is not None for k in WEATHER_FIELDS):
        db.add(
            WeatherCondition(
                activity_id=activity.id,
                temperature_c=fields.get("temperature_c"),
                feels_like_c=fields.get("feels_like_c"),
                humidity_pct=fields.get("humidity_pct"),
                wind_speed_kmh=fields.get("wind_speed_kmh"),
                precipitation_mm=fields.get("precipitation_mm"),
                condition=fields.get("condition"),
            )
        )

    return activity
