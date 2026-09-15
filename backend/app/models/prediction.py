"""Race-performance predictions (blueprint SS21-25)."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    distance_label: Mapped[str] = mapped_column(String)  # "5K" | "10K" | "half_marathon"
    predicted_time_s: Mapped[float] = mapped_column(Float)
    range_low_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    range_high_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String, nullable=True)  # low/medium/high
    model_version: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
