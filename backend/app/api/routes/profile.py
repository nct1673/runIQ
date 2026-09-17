"""User profile endpoints. Protected at the router level in app.main
(same as every other real router) -- this file is routing-only.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.user import User
from app.schemas.user_profile import UserProfileOut, UserProfileUpdate
from app.services.profile_service import get_or_create_profile, update_profile
from app.services.user_service import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserProfileOut)
def get_my_profile(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> UserProfileOut:
    return get_or_create_profile(db, user)


@router.patch("/me", response_model=UserProfileOut)
def update_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileOut:
    profile = get_or_create_profile(db, user)
    return update_profile(db, profile, payload)
