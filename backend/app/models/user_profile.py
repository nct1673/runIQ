"""User profile -- personal/physiological data and preferences, kept
separate from `users` (which stays auth-only: email + password_hash).
One-to-one with `users` via a unique `user_id` FK.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)

    # Basic info
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    sex: Mapped[str | None] = mapped_column(String, nullable=True)  # male | female | other

    # Physiological data -- training-zone calculations, calorie/pace
    # normalization (blueprint's Training Intelligence module)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    resting_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Preferences
    unit_system: Mapped[str] = mapped_column(String, default="metric")  # metric | imperial
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)  # IANA name, e.g. Asia/Kuala_Lumpur

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
