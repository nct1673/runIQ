"""Load activity data straight from the Garmin Connect API into
`activities_raw` (bronze layer), independent of the CSV-upload path in
raw_loader.py -- pure raw insert, no filtering/unit-conversion/validation.

Dedup key here is Garmin's own `activityId` (a real unique ID), unlike
the CSV path's synthetic row hash.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from garminconnect import Garmin
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity_raw import API_COLUMN_MAP, ActivityRaw

TOKEN_STORE = "~/.garminconnect"
PAGE_SIZE = 50


def fetch_activities(email: str, password: str, limit: int = 300) -> list[dict]:
    """Log into Garmin Connect (reusing the cached token at TOKEN_STORE
    when valid, otherwise a fresh email/password login) and return up to
    `limit` activity summaries, most recent first.
    """
    client = Garmin(email, password)
    try:
        client.login(TOKEN_STORE)
    except Exception:
        client.login()

    activities: list[dict] = []
    offset = 0
    while len(activities) < limit:
        batch = client.get_activities(offset, PAGE_SIZE)
        if not batch:
            break
        activities.extend(batch)
        offset += PAGE_SIZE
    return activities[:limit]


def remove_duplicates(
    db: Session, user_id: uuid.UUID, activities: list[dict]
) -> tuple[list[dict], int]:
    """Split `activities` into (new_activities, skipped_duplicate_count)
    by checking each activityId against what's already stored for this
    user.
    """
    ids = [a["activityId"] for a in activities]
    existing_ids = set(
        db.scalars(
            select(ActivityRaw.garmin_activity_id).where(
                ActivityRaw.user_id == user_id,
                ActivityRaw.garmin_activity_id.in_(ids),
            )
        )
    )
    new_activities = [a for a in activities if a["activityId"] not in existing_ids]
    skipped_duplicates = len(activities) - len(new_activities)
    return new_activities, skipped_duplicates


@dataclass
class GarminSyncResult:
    imported: int
    skipped_duplicates: int
    fetched: int


def load(db: Session, user_id: uuid.UUID, activities: list[dict]) -> GarminSyncResult:
    """Deduplicate `activities` against existing raw rows, then insert
    what's new."""
    new_activities, skipped_duplicates = remove_duplicates(db, user_id, activities)

    objects = []
    for act in new_activities:
        fields = {}
        for api_field, attr in API_COLUMN_MAP.items():
            value = act.get(api_field)
            if api_field in ("activityType", "eventType") and isinstance(value, dict):
                value = value.get("typeKey")
            fields[attr] = value

        objects.append(ActivityRaw(user_id=user_id, source="garmin_api", **fields))

    db.add_all(objects)
    db.commit()

    return GarminSyncResult(
        imported=len(objects), skipped_duplicates=skipped_duplicates, fetched=len(activities)
    )
