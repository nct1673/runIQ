#!/usr/bin/env python
"""First-run check, run by docker-entrypoint.sh after migrations.

The login password is hashed into the database from AUTH_PASSWORD the first
time the app starts (see user_service.get_or_create_default_user), so until
that has happened AUTH_PASSWORD must be set to something real. Once the
password exists in the database this check passes without it.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.core.db import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402

PLACEHOLDERS = {"", "change-me", "changeme", "password"}


def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == settings.default_user_email).first()
        if user is not None and user.password_hash:
            return

    if (settings.auth_password or "").strip().lower() in PLACEHOLDERS:
        sys.exit(
            "\nAUTH_PASSWORD is not set.\n"
            "Copy .env.example to .env, set AUTH_PASSWORD to the password you want\n"
            "to log in with, then run `docker compose up -d` again.\n"
        )


if __name__ == "__main__":
    main()
