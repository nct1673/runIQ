"""A run the user plans for a future day (dashboard week card) -- a type
and a distance, nothing more. Kept separate from `Race`, which is a dated
event with a result; a planned run is just training intent."""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

PLANNED_RUN_TYPES = ("Easy", "Long", "Tempo", "Intervals", "Recovery")


class PlannedRun(Base):
    __tablename__ = "planned_runs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    planned_date: Mapped[date] = mapped_column(Date, index=True)
    run_type: Mapped[str] = mapped_column(String)  # one of PLANNED_RUN_TYPES
    distance_km: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
