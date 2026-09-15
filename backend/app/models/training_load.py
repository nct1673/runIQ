"""Rolling training-load snapshots (blueprint SS18-19: 7d/28d load, fitness
vs. fatigue). Not tied to a single activity -- computed as of a date.
"""
import uuid
from datetime import date

from sqlalchemy import Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class TrainingLoad(Base):
    __tablename__ = "training_load"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    as_of_date: Mapped[date] = mapped_column(Date)
    load_7d: Mapped[float | None] = mapped_column(Float, nullable=True)
    load_28d: Mapped[float | None] = mapped_column(Float, nullable=True)
    fitness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    fatigue_score: Mapped[float | None] = mapped_column(Float, nullable=True)
