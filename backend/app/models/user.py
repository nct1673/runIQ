"""User table.

RunIQ is a single-user system today (blueprint SS4), but keeping a real
`users` table now means multi-user support later doesn't require a schema
rewrite -- every other table already has a `user_id` FK from day one.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
