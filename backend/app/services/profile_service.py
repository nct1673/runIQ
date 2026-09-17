"""User profile CRUD -- separate from app.services.user_service, which
stays auth-only (bootstrap user, password verify, session)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileUpdate


def get_or_create_profile(db: Session, user: User) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def update_profile(db: Session, profile: UserProfile, data: UserProfileUpdate) -> UserProfile:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile
