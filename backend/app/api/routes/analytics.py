"""Analytics endpoints (blueprint SS10-13): basic stats, trends, personal
baseline, similar-run engine. Delegates to app.services.analytics_service /
baseline_service / similar_run_service -- this file stays routing-only.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.analytics import SummaryOut
from app.services import analytics_service
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("/summary", response_model=SummaryOut)
def get_summary(db: Session = Depends(get_db)) -> SummaryOut:
    """Total distance/runs/duration -- blueprint SS10.1."""
    user = get_or_create_default_user(db)
    return analytics_service.get_summary(db, user.id)


@router.get("/baseline")
def get_baseline(db: Session = Depends(get_db)) -> dict:
    """The user's personal baseline -- blueprint SS12."""
    raise NotImplementedError("Phase 3: app.services.baseline_service.compute_baseline")


@router.get("/similar-runs/{activity_id}")
def get_similar_runs(activity_id: str, db: Session = Depends(get_db)) -> dict:
    """Historically similar runs to one activity -- blueprint SS13."""
    raise NotImplementedError("Phase 3: app.services.similar_run_service.find_similar")
