"""CRUD for user-managed race events (see app.models.race)."""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.race import RACE_PRIORITIES, RACE_STATUSES, Race


def list_races(db: Session, user_id: uuid.UUID) -> list[Race]:
    """Upcoming races soonest-first, then completed races most-recent-first --
    the natural reading order for a race calendar (what's next, then history)."""
    rows = db.scalars(select(Race).where(Race.user_id == user_id)).all()
    upcoming = sorted((r for r in rows if r.status == "upcoming"), key=lambda r: r.race_date)
    completed = sorted((r for r in rows if r.status == "completed"), key=lambda r: r.race_date, reverse=True)
    return upcoming + completed


def create_race(
    db: Session,
    user_id: uuid.UUID,
    *,
    name: str,
    distance_km: float,
    race_date,
    location: str | None = None,
    notes: str | None = None,
    goal_time_s: float | None = None,
    priority: str | None = None,
) -> Race:
    if priority is not None and priority not in RACE_PRIORITIES:
        raise ValueError(f"priority must be one of {RACE_PRIORITIES}")

    race = Race(
        user_id=user_id,
        name=name,
        distance_km=distance_km,
        race_date=race_date,
        location=location,
        notes=notes,
        goal_time_s=goal_time_s,
        priority=priority,
    )
    db.add(race)
    db.commit()
    db.refresh(race)
    return race


def get_race(db: Session, user_id: uuid.UUID, race_id: uuid.UUID) -> Race | None:
    return db.scalar(select(Race).where(Race.id == race_id, Race.user_id == user_id))


def update_race(db: Session, race: Race, fields: dict) -> Race:
    """Applies only the keys present in `fields` (a partial update -- the
    route builds this from the request body's set fields, e.g. editing a
    race's notes shouldn't require resending its date/distance too)."""
    if "priority" in fields and fields["priority"] is not None and fields["priority"] not in RACE_PRIORITIES:
        raise ValueError(f"priority must be one of {RACE_PRIORITIES}")
    if "status" in fields and fields["status"] not in RACE_STATUSES:
        raise ValueError(f"status must be one of {RACE_STATUSES}")

    for key, value in fields.items():
        setattr(race, key, value)

    db.commit()
    db.refresh(race)
    return race


def delete_race(db: Session, race: Race) -> None:
    db.delete(race)
    db.commit()
