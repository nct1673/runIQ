"""One message in an AI Coach conversation. `evidence` (JSON-encoded) is
only ever set on assistant messages -- the audit trail backing blueprint
§33's "the AI should not fabricate evidence" requirement.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id"))

    role: Mapped[str] = mapped_column(String)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON-encoded, assistant only

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
