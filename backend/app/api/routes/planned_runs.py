"""Planned-run endpoints -- add/edit/remove a planned run on a day."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.planned_run import PlannedRunCreate, PlannedRunOut, PlannedRunUpdate
from app.services import planned_run_service
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("", response_model=list[PlannedRunOut])
def list_planned_runs(
    start: date | None = None, end: date | None = None, db: Session = Depends(get_db)
) -> list[PlannedRunOut]:
    user = get_or_create_default_user(db)
    return planned_run_service.list_planned_runs(db, user.id, start, end)


@router.post("", response_model=PlannedRunOut, status_code=201)
def create_planned_run(payload: PlannedRunCreate, db: Session = Depends(get_db)) -> PlannedRunOut:
    user = get_or_create_default_user(db)
    try:
        return planned_run_service.create_planned_run(db, user.id, **payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch("/{run_id}", response_model=PlannedRunOut)
def update_planned_run(run_id: uuid.UUID, payload: PlannedRunUpdate, db: Session = Depends(get_db)) -> PlannedRunOut:
    user = get_or_create_default_user(db)
    run = planned_run_service.get_planned_run(db, user.id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Planned run not found")
    try:
        return planned_run_service.update_planned_run(db, run, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{run_id}", status_code=204)
def delete_planned_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    user = get_or_create_default_user(db)
    run = planned_run_service.get_planned_run(db, user.id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Planned run not found")
    planned_run_service.delete_planned_run(db, run)
