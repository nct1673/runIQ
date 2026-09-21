"""Load activity data straight from the Garmin Connect API into
`activities_raw` (bronze layer) -- pure raw insert, no
filtering/unit-conversion/validation.

Dedup key: Garmin's own `activityId`, a real unique ID.

Fetch strategy: ID-based early stop, not a full re-fetch every time.
`get_activities()` returns activities newest-first, so as soon as a page
contains an activityId we've already stored, everything on later pages
is guaranteed to be older and already synced too -- pagination stops
right there instead of pulling (and then discarding) the whole window
every run. This trades a small blind spot for far fewer API calls: a
historical activity manually backfilled into Garmin *after* a sync that
already passed its date range won't be picked up, since we stop before
reaching that far back once we've hit newer, already-known activities.
A periodic full sync (raise `limit` past your total activity count, with
no early stop) is the standard way to catch that -- not implemented here,
since it's an occasional maintenance operation, not the everyday path.
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


def _existing_activity_ids(db: Session, user_id: uuid.UUID) -> set[int]:
    """Every garmin_activity_id already stored for this user."""
    return set(
        db.scalars(
            select(ActivityRaw.garmin_activity_id).where(
                ActivityRaw.user_id == user_id,
                ActivityRaw.garmin_activity_id.isnot(None),
            )
        )
    )


def fetch_new_activities(
    db: Session, user_id: uuid.UUID, email: str, password: str, limit: int = 300
) -> list[dict]:
    """Log into Garmin Connect (reusing the cached token at TOKEN_STORE
    when valid, otherwise a fresh email/password login) and return only
    activities not already stored for this user, most recent first --
    stopping pagination as soon as a page reaches an already-known
    activityId (see module docstring for the early-stop rationale).
    """
    client = Garmin(email, password)
    try:
        client.login(TOKEN_STORE)
    except Exception:
        client.login()

    existing_ids = _existing_activity_ids(db, user_id)

    new_activities: list[dict] = []
    offset = 0
    while len(new_activities) < limit:
        batch = client.get_activities(offset, PAGE_SIZE)
        if not batch:
            break

        reached_known = False
        for act in batch:
            if act["activityId"] in existing_ids:
                reached_known = True
                break
            new_activities.append(act)

        if reached_known:
            break
        offset += PAGE_SIZE

    return new_activities[:limit]


def remove_duplicates(
    db: Session, user_id: uuid.UUID, activities: list[dict]
) -> tuple[list[dict], int]:
    """Split `activities` into (new_activities, skipped_duplicate_count)
    by checking each activityId against what's already stored for this
    user. Kept as a safety net at insert time (e.g. a concurrent sync, or
    a caller that didn't go through `fetch_new_activities`) -- early stop
    optimizes *fetching*, this guarantees correctness of the *insert*.
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
