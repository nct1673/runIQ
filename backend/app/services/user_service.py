"""Single-user helper. RunIQ has no auth yet (blueprint §4), so every
write needs a `user_id` to attach to. This guarantees exactly one `User`
row exists and returns it -- swapping to real multi-user auth later only
means changing how "the current user" is resolved here, not the
tables/foreign keys that already depend on `user_id`.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User


def get_or_create_default_user(db: Session) -> User:
    settings = get_settings()
    user = db.query(User).filter(User.email == settings.default_user_email).first()
    if user is None:
        user = User(email=settings.default_user_email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
