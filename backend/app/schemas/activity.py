"""Pydantic request/response schemas for the activities API."""
import uuid
from datetime import datetime

from pydantic import BaseModel


class ActivityOut(BaseModel):
    id: uuid.UUID
    started_at: datetime
    distance_km: float
    duration_s: float
    avg_pace_s_per_km: float | None = None
    avg_hr: float | None = None
    avg_cadence: float | None = None
    elevation_gain_m: float | None = None
    activity_type: str | None = None

    # Denormalized from the linked weather_conditions row (absent for
    # treadmill runs -- no GPS to look weather up against). Flattened onto
    # ActivityOut rather than nested, since the frontend list only ever
    # needs a handful of fields per card, not the full WeatherCondition.
    temperature_c: float | None = None
    weather_condition: str | None = None

    model_config = {"from_attributes": True}


class ActivityDetailOut(BaseModel):
    """Every column on `activities`, plus its linked `weather_conditions`
    row flattened on -- backs the /activities detail dropdown, which
    shows the full DB record for one run (blueprint SS8's widened
    schema; see app.models.activity)."""

    id: uuid.UUID
    source: str
    external_id: str | None = None
    started_at: datetime
    distance_km: float
    duration_s: float
    avg_pace_s_per_km: float | None = None
    avg_hr: float | None = None
    avg_cadence: float | None = None
    elevation_gain_m: float | None = None
    activity_type: str | None = None
    created_at: datetime

    raw_imported_at: datetime | None = None
    activity_name: str | None = None
    event_type: str | None = None
    elapsed_duration_s: float | None = None
    moving_duration_s: float | None = None
    calories: float | None = None
    avg_power: float | None = None
    norm_power: float | None = None
    avg_stride_length: float | None = None
    avg_vertical_oscillation: float | None = None
    avg_vertical_ratio: float | None = None
    avg_ground_contact_time: float | None = None
    start_latitude: float | None = None
    start_longitude: float | None = None
    training_effect_label: str | None = None
    vo2_max: float | None = None
    hr_time_in_zone_1: float | None = None
    hr_time_in_zone_2: float | None = None
    hr_time_in_zone_3: float | None = None
    hr_time_in_zone_4: float | None = None
    hr_time_in_zone_5: float | None = None
    power_time_in_zone_1: float | None = None
    power_time_in_zone_2: float | None = None
    power_time_in_zone_3: float | None = None
    power_time_in_zone_4: float | None = None
    power_time_in_zone_5: float | None = None
    location: str | None = None
    pace: str | None = None

    # Denormalized from the linked weather_conditions row, same as ActivityOut.
    temperature_c: float | None = None
    feels_like_c: float | None = None
    humidity_pct: float | None = None
    wind_speed_kmh: float | None = None
    precipitation_mm: float | None = None
    weather_condition: str | None = None

    model_config = {"from_attributes": True}


class GarminSyncResult(BaseModel):
    """Returned by POST /api/activities/sync-garmin. Covers both stages
    that route now runs: the raw Garmin pull (activities_raw) and the
    raw-to-processed pipeline (activities/weather_conditions) that runs
    immediately after it -- see app.ingestion.processor.
    """

    # Stage 1: raw pull (garmin_api_loader)
    fetched: int
    imported: int
    skipped_duplicates: int

    # Stage 2: raw-to-processed pipeline (processor.process_new_activities)
    processed: int
    skipped_non_running: int
    weather_matched: int
    rejected: int
    rejection_reasons: list[str]
