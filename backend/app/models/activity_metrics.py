"""Derived per-activity metrics (baseline deltas, weather-adjusted pace,
training-load contribution, etc.) -- kept separate from the raw imported
fields on `Activity` so re-computation never touches the source-of-truth
import data.
"""
import uuid

from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ActivityMetrics(Base):
    __tablename__ = "activity_metrics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("activities.id"), unique=True)

    baseline_pace_delta_s_per_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    weather_adjusted_pace_s_per_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    training_load_contribution: Mapped[float | None] = mapped_column(Float, nullable=True)
