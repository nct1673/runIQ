"""CRUD for planned runs (see app.models.planned_run)."""
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.planned_run import PLANNED_RUN_TYPES, PlannedRun


def _check_type(run_type: str) -> None:
    if run_type not in PLANNED_RUN_TYPES:
        raise ValueError(f"run_type must be one of {PLANNED_RUN_TYPES}")


def list_planned_runs(
    db: Session, user_id: uuid.UUID, start: date | None = None, end: date | None = None
) -> list[PlannedRun]:
    """Planned runs in [start, end] (either bound optional), earliest first."""
    stmt = select(PlannedRun).where(PlannedRun.user_id == user_id)
    if start is not None:
        stmt = stmt.where(PlannedRun.planned_date >= start)
    if end is not None:
        stmt = stmt.where(PlannedRun.planned_date <= end)
    return list(db.scalars(stmt.order_by(PlannedRun.planned_date, PlannedRun.created_at)).all())


def get_planned_run(db: Session, user_id: uuid.UUID, run_id: uuid.UUID) -> PlannedRun | None:
    return db.scalar(select(PlannedRun).where(PlannedRun.id == run_id, PlannedRun.user_id == user_id))


def create_planned_run(
    db: Session, user_id: uuid.UUID, *, planned_date: date, run_type: str, distance_km: float
) -> PlannedRun:
    _check_type(run_type)
    run = PlannedRun(user_id=user_id, planned_date=planned_date, run_type=run_type, distance_km=distance_km)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def update_planned_run(db: Session, run: PlannedRun, fields: dict) -> PlannedRun:
    if "run_type" in fields and fields["run_type"] is not None:
        _check_type(fields["run_type"])
    for key, value in fields.items():
        if value is not None:
            setattr(run, key, value)
    db.commit()
    db.refresh(run)
    return run


def delete_planned_run(db: Session, run: PlannedRun) -> None:
    db.delete(run)
    db.commit()
