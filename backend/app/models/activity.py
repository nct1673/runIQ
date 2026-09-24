"""Core `activities` table -- one row per run, the gold-layer output of
raw_process.ipynb's raw->processed pipeline.

The original 7-column set (distance_km..activity_type) came from the
blueprint (SS5.1) scaffold, written before that notebook existed. The
columns below it were added to match the notebook's final df 1:1 --
schema only, no loader wired up yet; that transform (raw_process.ipynb
-> here) is still the user's own to build (see
app.ingestion.normalizer, which only fills the original 7 today).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    source: Mapped[str] = mapped_column(String, default="garmin_csv_upload")
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)  # dedup key

    started_at: Mapped[datetime] = mapped_column(DateTime)
    distance_km: Mapped[float] = mapped_column(Float)
    duration_s: Mapped[float] = mapped_column(Float)
    avg_pace_s_per_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_cadence: Mapped[float | None] = mapped_column(Float, nullable=True)
    elevation_gain_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_type: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # -- Widened to match raw_process.ipynb's final df (see module
    # docstring). Names follow the notebook's own columns, minus the
    # "api_"/"weather_" bookkeeping that only mattered for the raw table.
    raw_imported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    activity_name: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str | None] = mapped_column(String, nullable=True)
    elapsed_duration_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    moving_duration_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_power: Mapped[float | None] = mapped_column(Float, nullable=True)
    norm_power: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_stride_length: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_vertical_oscillation: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_vertical_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_ground_contact_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    training_effect_label: Mapped[str | None] = mapped_column(String, nullable=True)
    vo2_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    hr_time_in_zone_1: Mapped[float | None] = mapped_column(Float, nullable=True)
    hr_time_in_zone_2: Mapped[float | None] = mapped_column(Float, nullable=True)
    hr_time_in_zone_3: Mapped[float | None] = mapped_column(Float, nullable=True)
    hr_time_in_zone_4: Mapped[float | None] = mapped_column(Float, nullable=True)
    hr_time_in_zone_5: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_time_in_zone_1: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_time_in_zone_2: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_time_in_zone_3: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_time_in_zone_4: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_time_in_zone_5: Mapped[float | None] = mapped_column(Float, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    pace: Mapped[str | None] = mapped_column(String, nullable=True)  # formatted "mm:ss", alongside avg_pace_s_per_km
    # Weather is deliberately NOT duplicated here -- app.models.weather.WeatherCondition
    # is the real, already-wired 1:1 weather table (see app.services.weather_service
    # + app.ingestion.loader.load_one). An earlier pass added weather_* columns
    # directly on Activity; removed once that duplication was spotted.
