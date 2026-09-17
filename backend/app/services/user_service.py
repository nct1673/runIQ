"""Single-user helper + login-module auth.

RunIQ is single-user by design (blueprint §4): there's exactly one
`User` row, bootstrapped from `.env` (`AUTH_EMAIL`/`AUTH_PASSWORD`)
rather than a signup flow. The login module (§ "Login Module" plan) sits
on top of this -- it's an access gate, not multi-user support. Swapping
to real multi-user auth later only means changing how "the current
user" is resolved, not the tables/foreign keys that already depend on
`user_id`.
"""
from __future__ import annotations

import uuid

import bcrypt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.models.user import User


def get_or_create_default_user(db: Session) -> User:
    """Ensure the single bootstrap user exists, with a password hash set
    from `AUTH_PASSWORD` if it isn't already (covers a fresh DB and the
    one row that predates the login module).
    """
    settings = get_settings()
    user = db.query(User).filter(User.email == settings.default_user_email).first()
    if user is None:
        user = User(email=settings.default_user_email)
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.password_hash is None and settings.auth_password:
        user.password_hash = _hash_password(settings.auth_password)
        db.commit()

    return user


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(user: User, password: str) -> bool:
    if not user.password_hash:
        return False
    return bcrypt.checkpw(password.encode(), user.password_hash.encode())


def set_password(db: Session, user: User, new_password: str) -> None:
    """Used by POST /api/auth/change-password. Note: this is the only
    way to change the password after bootstrap -- editing AUTH_PASSWORD
    in .env again does nothing once password_hash is already set.

    Bumps `session_version`, which invalidates every previously-issued
    session cookie (get_current_user checks it) -- the route that calls
    this re-syncs the *current* request's session to the new version
    right after, so the session making the change stays logged in while
    any other copy of the old cookie (another device, a leaked cookie)
    stops working on its next request.
    """
    user.password_hash = _hash_password(new_password)
    user.session_version += 1
    db.commit()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: 401s unless `request.session` holds a valid
    `user_id` (set by POST /api/auth/login) whose `session_version`
    still matches the user's current one -- a password change bumps the
    stored version, so older session cookies stop being accepted even
    though they're still validly signed.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user = db.get(User, uuid.UUID(user_id))
    except ValueError:
        user = None
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if request.session.get("session_version") != user.session_version:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    return user
