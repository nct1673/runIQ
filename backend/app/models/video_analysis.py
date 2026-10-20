"""Running-form video uploads (new feature, not in the original
blueprint). A user uploads a side-view running video; the actual
pose-estimation/form-analysis pipeline is intentionally NOT implemented
here -- see app.services.video_analysis_service.analyze.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

VIDEO_ANALYSIS_STATUSES = ("pending", "processing", "completed", "failed")


class VideoAnalysis(Base):
    __tablename__ = "video_analyses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    original_filename: Mapped[str] = mapped_column(String)
    storage_path: Mapped[str] = mapped_column(String)  # relative to app.services.video_analysis_service.VIDEO_STORAGE_DIR.parent
    content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String, default="pending")  # one of VIDEO_ANALYSIS_STATUSES
    # JSON-encoded analysis output -- shape intentionally undefined until
    # the analysis pipeline (see services.video_analysis_service.analyze)
    # is actually built.
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
