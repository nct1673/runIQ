"""Login module endpoints -- a single-user access gate, not multi-user
auth. See app.services.user_service for the bootstrap/verify/session
logic; this file is routing-only.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, UserOut
from app.services.user_service import (
    get_current_user,
    get_or_create_default_user,
    set_password,
    verify_password,
)

router = APIRouter()


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> UserOut:
    user = get_or_create_default_user(db)
    if payload.email != user.email or not verify_password(user, payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    request.session["user_id"] = str(user.id)
    return user


@router.post("/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)) -> UserOut:
    return user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(user, payload.current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    set_password(db, user, payload.new_password)
    return {"status": "ok"}
