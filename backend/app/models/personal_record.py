"""Personal bests per distance, synced from Garmin Connect's own PR
tracking (`garminconnect.Garmin.get_personal_record()`) rather than
computed from `activities` ourselves -- Garmin already tracks these
against its full activity history (including anything from before this
app existed), which RunIQ's own `activities` table may not have.

One row per (user, type_id): each sync upserts in place, so this always
holds the *current* best per category, not a history of every PR ever
set. Garmin's PR list also covers non-running stats (steps, floors,
etc.) -- only the running-relevant type_ids are synced here, see
app.ingestion.garmin_personal_records_loader.KNOWN_TYPES.
"""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class PersonalRecord(Base):
    __tablename__ = "personal_records"
    __table_args__ = (UniqueConstraint("user_id", "type_id", name="uq_personal_records_user_type"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    type_id: Mapped[int] = mapped_column(Integer)  # Garmin's own PR typeId
    label: Mapped[str] = mapped_column(String)  # "1 km", "5 km", "Half Marathon", "Longest Run", ...
    metric: Mapped[str] = mapped_column(String)  # "time_s" | "distance_m"
    value: Mapped[float] = mapped_column(Float)  # seconds (metric="time_s") or meters (metric="distance_m")

    garmin_activity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    activity_name: Mapped[str | None] = mapped_column(String, nullable=True)
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
