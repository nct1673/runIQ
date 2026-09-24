"""User-managed race events -- upcoming races to train toward, and
completed ones with their actual result. Replaces the earlier `Goal`
stub (blueprint SS26-28's "race goal" concept), which never got past a
3-column placeholder with no working endpoints.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

RACE_STATUSES = ("upcoming", "completed")
RACE_PRIORITIES = ("A", "B", "C")  # A = goal race, B/C = tune-up/lower priority


class Race(Base):
    __tablename__ = "races"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    name: Mapped[str] = mapped_column(String)
    distance_km: Mapped[float] = mapped_column(Float)
    race_date: Mapped[date] = mapped_column(Date)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)

    goal_time_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    priority: Mapped[str | None] = mapped_column(String, nullable=True)  # one of RACE_PRIORITIES

    status: Mapped[str] = mapped_column(String, default="upcoming")  # one of RACE_STATUSES
    actual_time_s: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
