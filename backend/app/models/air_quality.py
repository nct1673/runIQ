"""Air-quality snapshot associated with one activity (blueprint SS6.2)."""
import uuid

from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AirQuality(Base):
    __tablename__ = "air_quality"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("activities.id"), unique=True)

    aqi: Mapped[float | None] = mapped_column(Float, nullable=True)
    pm2_5: Mapped[float | None] = mapped_column(Float, nullable=True)
    pm10: Mapped[float | None] = mapped_column(Float, nullable=True)
    ozone: Mapped[float | None] = mapped_column(Float, nullable=True)
