"""Short-lived, unguessable scope tokens for the Coach's read-only SQL
tool. The `coach.*` views only return rows for the user a *valid* token
maps to, so a query can't pick whose data it reads by setting a session
variable to a user id -- it would need a 256-bit token it was never given
for anyone else. `coach_ro` has no grant on this table.
See app/services/coach/readonly_db.py.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class CoachSession(Base):
    __tablename__ = "coach_sessions"

    token: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
