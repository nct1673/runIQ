"""Goal tracking endpoints (blueprint SS26-28)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db

router = APIRouter()


@router.get("/")
def list_goals(db: Session = Depends(get_db)) -> list[dict]:
    raise NotImplementedError("Phase 5: app.services.goal_service.list_goals")


@router.post("/")
def create_goal(db: Session = Depends(get_db)) -> dict:
    raise NotImplementedError("Phase 5: app.services.goal_service.create_goal")


@router.get("/{goal_id}/progress")
def get_goal_progress(goal_id: str, db: Session = Depends(get_db)) -> dict:
    raise NotImplementedError("Phase 5: app.services.goal_service.progress")
