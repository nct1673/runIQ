"""Basic + performance analytics (blueprint SS10-11): totals, trends,
pace/HR/cadence over time -- the dashboard should answer "what is
happening to my running?", not just reproduce Strava.
"""
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity


def get_summary(db: Session, user_id: uuid.UUID) -> dict:
    """Totals across every processed activity -- blueprint SS10.1. Simple
    aggregates only (count/sum); no calories total yet, since Activity
    has nowhere to hold one (the raw Garmin field exists on ActivityRaw
    as api_calories, but normalizer.normalize_one doesn't map it across
    -- add a calories column + mapping first if that's wanted here).
    """
    row = db.execute(
        select(
            func.count(Activity.id),
            func.coalesce(func.sum(Activity.distance_km), 0.0),
            func.coalesce(func.sum(Activity.duration_s), 0.0),
        ).where(Activity.user_id == user_id)
    ).one()
    total_runs, total_distance_km, total_duration_s = row

    return {
        "total_runs": total_runs,
        "total_distance_km": total_distance_km,
        "total_duration_s": total_duration_s,
    }


def get_trends(user_id) -> dict:
    raise NotImplementedError("Phase 3: pace/HR/cadence/distance trend series for charting")
