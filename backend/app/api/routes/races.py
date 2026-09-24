"""Race event endpoints -- add/edit/delete upcoming races, mark one
completed with its actual result. See app.services.race_service.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.race import RaceCreate, RaceOut, RaceUpdate
from app.services import race_service
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("", response_model=list[RaceOut])
def list_races(db: Session = Depends(get_db)) -> list[RaceOut]:
    """Upcoming races soonest-first, then completed races most-recent-first."""
    user = get_or_create_default_user(db)
    return race_service.list_races(db, user.id)


@router.post("", response_model=RaceOut, status_code=201)
def create_race(payload: RaceCreate, db: Session = Depends(get_db)) -> RaceOut:
    user = get_or_create_default_user(db)
    try:
        return race_service.create_race(db, user.id, **payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch("/{race_id}", response_model=RaceOut)
def update_race(race_id: uuid.UUID, payload: RaceUpdate, db: Session = Depends(get_db)) -> RaceOut:
    """Partial update -- only fields set in the request body are applied.
    Also how a race is marked completed: PATCH status="completed" +
    actual_time_s."""
    user = get_or_create_default_user(db)
    race = race_service.get_race(db, user.id, race_id)
    if race is None:
        raise HTTPException(status_code=404, detail="Race not found")

    fields = payload.model_dump(exclude_unset=True)
    try:
        return race_service.update_race(db, race, fields)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete("/{race_id}", status_code=204)
def delete_race(race_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    user = get_or_create_default_user(db)
    race = race_service.get_race(db, user.id, race_id)
    if race is None:
        raise HTTPException(status_code=404, detail="Race not found")
    race_service.delete_race(db, race)
