"""CRUD + Garmin sync for personal records (see app.models.personal_record)."""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ingestion.garmin_personal_records_loader import KNOWN_TYPES, fetch_personal_records
from app.models.personal_record import PersonalRecord


def list_personal_records(db: Session, user_id: uuid.UUID) -> list[PersonalRecord]:
    """All synced records, ordered to match KNOWN_TYPES' natural
    distance progression (1km .. marathon .. longest run) rather than
    insertion order."""
    rows = db.scalars(select(PersonalRecord).where(PersonalRecord.user_id == user_id)).all()
    order = list(KNOWN_TYPES.keys())
    return sorted(rows, key=lambda r: order.index(r.type_id) if r.type_id in order else len(order))


def sync_from_garmin(db: Session, user_id: uuid.UUID, email: str, password: str) -> list[PersonalRecord]:
    """Fetch current PRs from Garmin and upsert one row per type_id --
    each sync overwrites the previous value/activity/achieved_at, since
    this table tracks the *current* best per category, not history."""
    fetched = fetch_personal_records(email, password)

    existing = {
        r.type_id: r
        for r in db.scalars(select(PersonalRecord).where(PersonalRecord.user_id == user_id))
    }

    for rec in fetched:
        row = existing.get(rec["type_id"])
        if row is None:
            row = PersonalRecord(user_id=user_id, type_id=rec["type_id"])
            db.add(row)
        row.label = rec["label"]
        row.metric = rec["metric"]
        row.value = rec["value"]
        row.garmin_activity_id = rec["garmin_activity_id"]
        row.activity_name = rec["activity_name"]
        row.achieved_at = rec["achieved_at"]

    db.commit()
    return list_personal_records(db, user_id)
