"""Analytics endpoints (blueprint SS10-13): basic stats, trends, personal
baseline, similar-run engine. Delegates to app.services.analytics_service /
baseline_service / similar_run_service -- this file stays routing-only.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.analytics import (
    MonthlyMileagePoint,
    PaceTrendPoint,
    SummaryOut,
    TypeSplitEntry,
    WeeklyMileagePoint,
)
from app.services import analytics_service
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("/summary", response_model=SummaryOut)
def get_summary(db: Session = Depends(get_db)) -> SummaryOut:
    """Totals, average pace, and week-over-week distance delta --
    blueprint SS10.1."""
    user = get_or_create_default_user(db)
    return analytics_service.get_summary(db, user.id)


@router.get("/weekly-mileage", response_model=list[WeeklyMileagePoint])
def get_weekly_mileage(
    weeks: int = Query(10, ge=1, le=104), db: Session = Depends(get_db)
) -> list[WeeklyMileagePoint]:
    """Distance + run count per calendar week, oldest to newest. Capped at
    104 weeks (2 years) -- get_weekly_mileage builds one dict per week
    in Python, so an unbounded `weeks` is a cheap way to force a huge
    allocation."""
    user = get_or_create_default_user(db)
    return analytics_service.get_weekly_mileage(db, user.id, weeks=weeks)


@router.get("/monthly-mileage", response_model=list[MonthlyMileagePoint])
def get_monthly_mileage(
    months: int = Query(12, ge=1, le=60), db: Session = Depends(get_db)
) -> list[MonthlyMileagePoint]:
    """Distance + run count per calendar month, oldest to newest. Capped
    at 60 months (5 years), same resource-exhaustion reasoning as
    get_weekly_mileage."""
    user = get_or_create_default_user(db)
    return analytics_service.get_monthly_mileage(db, user.id, months=months)


@router.get("/pace-trend", response_model=list[PaceTrendPoint])
def get_pace_trend(limit: int = Query(12, ge=1, le=200), db: Session = Depends(get_db)) -> list[PaceTrendPoint]:
    """The last `limit` runs' pace, oldest to newest."""
    user = get_or_create_default_user(db)
    return analytics_service.get_pace_trend(db, user.id, limit=limit)


@router.get("/type-split", response_model=list[TypeSplitEntry])
def get_type_split(db: Session = Depends(get_db)) -> list[TypeSplitEntry]:
    """Run count + distance per activity_type."""
    user = get_or_create_default_user(db)
    return analytics_service.get_type_split(db, user.id)


@router.get("/baseline")
def get_baseline(db: Session = Depends(get_db)) -> dict:
    """The user's personal baseline -- blueprint SS12."""
    raise NotImplementedError("Phase 3: app.services.baseline_service.compute_baseline")


@router.get("/similar-runs/{activity_id}")
def get_similar_runs(activity_id: str, db: Session = Depends(get_db)) -> dict:
    """Historically similar runs to one activity -- blueprint SS13."""
    raise NotImplementedError("Phase 3: app.services.similar_run_service.find_similar")
