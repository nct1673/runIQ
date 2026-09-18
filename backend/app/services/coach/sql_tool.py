"""Structured-question tools: safe, parameterized queries against the
current user's own data -- never freeform LLM-generated SQL.

Every function here takes `user_id` as its first argument and filters on
it. That's necessary but not sufficient for isolation on its own --
router.py binds `user_id` into each function via `functools.partial`
*before* the tool schema is ever shown to the LLM, so `user_id` never
appears as a tool-call parameter the model could set. See
docs/rag_coach_plan.md §1 for the full design.

`activities` is empty until the raw->processed pipeline exists (separate,
user-owned work) -- these functions are correct against the schema
regardless and degrade to an explicit "no data" result rather than
erroring.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.activity import Activity


def _summarize(db: Session, user_id: uuid.UUID, since: datetime) -> dict:
    row = (
        db.query(
            func.count(Activity.id),
            func.sum(Activity.distance_km),
            func.sum(Activity.duration_s),
            func.avg(Activity.avg_pace_s_per_km),
            func.avg(Activity.avg_hr),
        )
        .filter(Activity.user_id == user_id, Activity.started_at >= since)
        .one()
    )
    count, total_distance_km, total_duration_s, avg_pace_s_per_km, avg_hr = row

    if not count:
        return {"run_count": 0, "message": "No activities found in this period."}

    return {
        "run_count": count,
        "total_distance_km": round(total_distance_km or 0, 2),
        "total_duration_s": round(total_duration_s or 0, 1),
        "avg_pace_s_per_km": round(avg_pace_s_per_km, 1) if avg_pace_s_per_km else None,
        "avg_hr": round(avg_hr, 1) if avg_hr else None,
    }


def get_recent_summary(db: Session, user_id: uuid.UUID, days: int) -> dict:
    """Totals/averages over the last `days` days."""
    since = datetime.utcnow() - timedelta(days=days)
    return {"period_days": days, **_summarize(db, user_id, since)}


def get_baseline(db: Session, user_id: uuid.UUID) -> dict:
    """The user's typical/baseline numbers -- lightweight version (all-time
    average) until app.services.baseline_service is built out; blueprint §12.
    """
    row = (
        db.query(
            func.count(Activity.id),
            func.avg(Activity.avg_pace_s_per_km),
            func.avg(Activity.avg_hr),
            func.avg(Activity.avg_cadence),
        )
        .filter(Activity.user_id == user_id)
        .one()
    )
    count, avg_pace_s_per_km, avg_hr, avg_cadence = row

    if not count:
        return {"message": "No activities yet -- baseline not available."}

    return {
        "based_on_runs": count,
        "avg_pace_s_per_km": round(avg_pace_s_per_km, 1) if avg_pace_s_per_km else None,
        "avg_hr": round(avg_hr, 1) if avg_hr else None,
        "avg_cadence": round(avg_cadence, 1) if avg_cadence else None,
    }


def compare_periods(db: Session, user_id: uuid.UUID, period_a_days: int, period_b_days: int) -> dict:
    """Compare 'the last period_a_days' against 'the period_b_days before
    that' -- e.g. days=30 running vs. the 30 days before it (§ "faster
    than 6 months ago?" pattern, generalized to arbitrary windows).
    """
    now = datetime.utcnow()
    recent = _summarize(db, user_id, now - timedelta(days=period_a_days))

    earlier_start = now - timedelta(days=period_a_days + period_b_days)
    earlier_end = now - timedelta(days=period_a_days)
    earlier_row = (
        db.query(
            func.count(Activity.id),
            func.sum(Activity.distance_km),
            func.sum(Activity.duration_s),
            func.avg(Activity.avg_pace_s_per_km),
            func.avg(Activity.avg_hr),
        )
        .filter(
            Activity.user_id == user_id,
            Activity.started_at >= earlier_start,
            Activity.started_at < earlier_end,
        )
        .one()
    )
    count, total_distance_km, total_duration_s, avg_pace_s_per_km, avg_hr = earlier_row
    earlier = (
        {"run_count": 0, "message": "No activities found in this period."}
        if not count
        else {
            "run_count": count,
            "total_distance_km": round(total_distance_km or 0, 2),
            "total_duration_s": round(total_duration_s or 0, 1),
            "avg_pace_s_per_km": round(avg_pace_s_per_km, 1) if avg_pace_s_per_km else None,
            "avg_hr": round(avg_hr, 1) if avg_hr else None,
        }
    )

    return {"recent_period": recent, "earlier_period": earlier}


def get_similar_runs(db: Session, user_id: uuid.UUID, activity_id: str, k: int = 5) -> dict:
    """Historically similar runs to one activity -- same activity_type,
    distance within +/-15%, most recent first. Blueprint §13.
    """
    try:
        target_id = uuid.UUID(activity_id)
    except ValueError:
        return {"message": "Invalid activity_id."}

    target = (
        db.query(Activity)
        .filter(Activity.id == target_id, Activity.user_id == user_id)
        .first()
    )
    if target is None:
        return {"message": "Activity not found."}

    low, high = target.distance_km * 0.85, target.distance_km * 1.15
    similar = (
        db.query(Activity)
        .filter(
            Activity.user_id == user_id,
            Activity.id != target_id,
            Activity.activity_type == target.activity_type,
            Activity.distance_km.between(low, high),
        )
        .order_by(Activity.started_at.desc())
        .limit(k)
        .all()
    )

    return {
        "target": {
            "distance_km": target.distance_km,
            "avg_pace_s_per_km": target.avg_pace_s_per_km,
            "activity_type": target.activity_type,
        },
        "similar_runs": [
            {
                "started_at": a.started_at.isoformat(),
                "distance_km": a.distance_km,
                "avg_pace_s_per_km": a.avg_pace_s_per_km,
                "avg_hr": a.avg_hr,
            }
            for a in similar
        ],
    }
