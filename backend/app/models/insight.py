"""Generated natural-language insights / AI Coach answers, kept for history
and for the evidence-based-answer audit trail (blueprint SS33).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    question: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON-encoded evidence list
    source: Mapped[str | None] = mapped_column(String, nullable=True)  # sql | analytics | rag | mixed

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
