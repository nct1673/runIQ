"""Core `activities` table -- one row per run, imported from a Garmin CSV
export.

Columns mirror the fields already confirmed in the blueprint (SS5.1); the
exact Garmin CSV column mapping is finalized in
`app.ingestion.csv_parser` once the real export headers are inspected
during Phase 1.
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
