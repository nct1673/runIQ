"""Database access for the Coach's free-form SQL tool.

Uses a separate engine that logs in as the `coach_ro` Postgres role -- NOT
the app's normal `runiq` login (a superuser in docker-compose). That role
can only SELECT from the user-scoped views in the `coach` schema, is
read-only at the role level, and has a 5s statement timeout (all set in
migration c04a7d1e5b92). So even if the LLM emits DROP/UPDATE/DELETE, the
database refuses it; nothing here relies on the model behaving.

Whose rows the views return is decided by an unguessable per-request
token (migration d5e8a2b71f30): the app stores (token -> user_id) in
`coach_sessions` over the privileged connection, then binds only the
token on the coach_ro session. A query that forges `app.session_token`
matches no row and sees nothing; it can't name a user id at all.
"""
from __future__ import annotations

import secrets
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal

TOKEN_TTL = timedelta(seconds=60)


@lru_cache
def _engine() -> Engine:
    settings = get_settings()
    if not settings.coach_db_password:
        raise RuntimeError("COACH_DB_PASSWORD is not set")
    url = make_url(settings.database_url).set(
        username=settings.coach_db_user, password=settings.coach_db_password
    )
    return create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2)


@contextmanager
def readonly_session(user_id: uuid.UUID) -> Iterator[Session]:
    """A coach_ro session scoped to `user_id` via a fresh one-time token.
    Always rolled back (nothing to commit); the token is deleted on exit."""
    _engine()  # fail fast (RuntimeError) before minting a token if unconfigured
    token = secrets.token_hex(32)
    with SessionLocal() as admin:
        admin.execute(text("DELETE FROM coach_sessions WHERE expires_at < now()"))
        admin.execute(
            text("INSERT INTO coach_sessions (token, user_id, expires_at) VALUES (:t, :u, :e)"),
            {"t": token, "u": user_id, "e": datetime.now(timezone.utc) + TOKEN_TTL},
        )
        admin.commit()  # must be visible to the coach_ro connection
    try:
        with Session(_engine()) as session:
            session.execute(text("SELECT set_config('app.session_token', :t, true)"), {"t": token})
            try:
                yield session
            finally:
                session.rollback()
    finally:
        with SessionLocal() as admin:
            admin.execute(text("DELETE FROM coach_sessions WHERE token = :t"), {"t": token})
            admin.commit()
