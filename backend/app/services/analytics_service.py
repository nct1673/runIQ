"""Basic + performance analytics (blueprint SS10-11): totals, trends,
pace/HR/cadence over time -- the dashboard should answer "what is
happening to my running?", not just reproduce Strava.
"""
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity


def get_summary(db: Session, user_id: uuid.UUID) -> dict:
    """Totals across every processed activity -- blueprint SS10.1, plus
    average pace and a week-over-week distance delta so the top stat
    row has something more than static totals. No calories total yet,
    since Activity has nowhere to hold one (the raw Garmin field exists
    on ActivityRaw as api_calories, but normalizer.normalize_one doesn't
    map it across -- add a calories column + mapping first if that's
    wanted here).
    """
    row = db.execute(
        select(
            func.count(Activity.id),
            func.coalesce(func.sum(Activity.distance_km), 0.0),
            func.coalesce(func.sum(Activity.duration_s), 0.0),
        ).where(Activity.user_id == user_id)
    ).one()
    total_runs, total_distance_km, total_duration_s = row

    avg_pace_s_per_km = total_duration_s / total_distance_km if total_distance_km > 0 else None

    now = datetime.utcnow()
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    this_week_km, last_week_km = db.execute(
        select(
            func.coalesce(
                func.sum(Activity.distance_km).filter(Activity.started_at >= this_week_start), 0.0
            ),
            func.coalesce(
                func.sum(Activity.distance_km).filter(
                    Activity.started_at >= last_week_start, Activity.started_at < this_week_start
                ),
                0.0,
            ),
        ).where(Activity.user_id == user_id)
    ).one()

    distance_delta_pct = (
        (this_week_km - last_week_km) / last_week_km * 100 if last_week_km > 0 else None
    )

    return {
        "total_runs": total_runs,
        "total_distance_km": total_distance_km,
        "total_duration_s": total_duration_s,
        "avg_pace_s_per_km": avg_pace_s_per_km,
        "distance_delta_pct": distance_delta_pct,
    }


def get_weekly_mileage(db: Session, user_id: uuid.UUID, weeks: int = 10) -> list[dict]:
    """Distance + run count per calendar week (Monday-start), oldest to
    newest, for the last `weeks` weeks -- including weeks with zero runs,
    so a bar chart shows real gaps instead of silently compressing them.
    """
    today = datetime.utcnow().date()
    current_week_start = today - timedelta(days=today.weekday())
    earliest_week_start = current_week_start - timedelta(weeks=weeks - 1)

    rows = db.execute(
        select(Activity.started_at, Activity.distance_km)
        .where(Activity.user_id == user_id, Activity.started_at >= earliest_week_start)
        .order_by(Activity.started_at)
    ).all()

    buckets: dict[object, dict] = {}
    for started_at, distance_km in rows:
        week_start = started_at.date() - timedelta(days=started_at.weekday())
        bucket = buckets.setdefault(week_start, {"distance_km": 0.0, "runs": 0})
        bucket["distance_km"] += distance_km
        bucket["runs"] += 1

    return [
        {
            "week_start": earliest_week_start + timedelta(weeks=i),
            "distance_km": buckets.get(earliest_week_start + timedelta(weeks=i), {}).get(
                "distance_km", 0.0
            ),
            "runs": buckets.get(earliest_week_start + timedelta(weeks=i), {}).get("runs", 0),
        }
        for i in range(weeks)
    ]


def _shift_months(d: date, n: int) -> date:
    """First-of-month `n` calendar months from `d` (n may be negative)."""
    month_index = d.month - 1 + n
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def get_monthly_mileage(db: Session, user_id: uuid.UUID, months: int = 12) -> list[dict]:
    """Distance + run count per calendar month, oldest to newest, for the
    last `months` months -- including months with zero runs, mirroring
    get_weekly_mileage's zero-filled bucketing so the bar chart shows
    real gaps instead of silently compressing them.
    """
    current_month_start = datetime.utcnow().date().replace(day=1)
    earliest_month_start = _shift_months(current_month_start, -(months - 1))

    rows = db.execute(
        select(Activity.started_at, Activity.distance_km)
        .where(Activity.user_id == user_id, Activity.started_at >= earliest_month_start)
        .order_by(Activity.started_at)
    ).all()

    buckets: dict[date, dict] = {}
    for started_at, distance_km in rows:
        month_start = started_at.date().replace(day=1)
        bucket = buckets.setdefault(month_start, {"distance_km": 0.0, "runs": 0})
        bucket["distance_km"] += distance_km
        bucket["runs"] += 1

    return [
        {
            "month_start": (month_start := _shift_months(earliest_month_start, i)),
            "distance_km": buckets.get(month_start, {}).get("distance_km", 0.0),
            "runs": buckets.get(month_start, {}).get("runs", 0),
        }
        for i in range(months)
    ]


def _recent_aerobic_base_activities(db: Session, user_id: uuid.UUID, months: int) -> list[Activity]:
    """AEROBIC_BASE-labeled activities from the last `months` calendar
    months, oldest to newest -- the shared basis for pace-trend and
    biomechanics-trend, both "how's this metric moving on easy runs"
    charts that would otherwise get skewed by hard workouts/races run
    at a deliberately different effort.
    """
    earliest = _shift_months(datetime.utcnow().date().replace(day=1), -(months - 1))

    return list(
        db.execute(
            select(Activity)
            .where(
                Activity.user_id == user_id,
                Activity.training_effect_label == "AEROBIC_BASE",
                Activity.started_at >= earliest,
            )
            .order_by(Activity.started_at.asc())
        ).scalars().all()
    )


def get_pace_trend(db: Session, user_id: uuid.UUID, months: int = 6) -> list[dict]:
    """Pace for AEROBIC_BASE runs in the last `months` calendar months,
    oldest to newest. Only runs with a known pace (avg_pace_s_per_km is
    nullable on Activity for e.g. malformed rows).
    """
    return [
        {
            "activity_id": str(a.id),
            "started_at": a.started_at,
            "avg_pace_s_per_km": a.avg_pace_s_per_km,
            "distance_km": a.distance_km,
            "activity_type": a.activity_type,
        }
        for a in _recent_aerobic_base_activities(db, user_id, months)
        if a.avg_pace_s_per_km is not None
    ]


def get_biomechanics_trend(db: Session, user_id: uuid.UUID, months: int = 6) -> list[dict]:
    """Cadence/stride/vertical-oscillation/vertical-ratio/ground-contact-
    time for AEROBIC_BASE runs in the last `months` calendar months,
    oldest to newest -- same basis as get_pace_trend (see
    _recent_aerobic_base_activities), one row per activity with all five
    metrics together so the frontend can chart each as its own card
    from a single fetch. Individual metrics are nullable on Activity
    (not every device/activity records all of them); rows are still
    included with whichever fields are present, since a per-metric chart
    filters its own nulls.
    """
    return [
        {
            "activity_id": str(a.id),
            "started_at": a.started_at,
            "distance_km": a.distance_km,
            "activity_type": a.activity_type,
            "avg_cadence": a.avg_cadence,
            "avg_stride_length": a.avg_stride_length,
            "avg_vertical_oscillation": a.avg_vertical_oscillation,
            "avg_vertical_ratio": a.avg_vertical_ratio,
            "avg_ground_contact_time": a.avg_ground_contact_time,
        }
        for a in _recent_aerobic_base_activities(db, user_id, months)
    ]


def get_type_split(db: Session, user_id: uuid.UUID) -> list[dict]:
    """Run count + distance per `activity_type` (e.g. running vs
    treadmill_running) -- a real breakdown the activities table already
    supports, in place of a HR-zone split that would need zone
    thresholds nothing in the schema defines yet.
    """
    rows = db.execute(
        select(
            func.coalesce(Activity.activity_type, "unknown"),
            func.count(Activity.id),
            func.coalesce(func.sum(Activity.distance_km), 0.0),
        )
        .where(Activity.user_id == user_id)
        .group_by(func.coalesce(Activity.activity_type, "unknown"))
        .order_by(func.sum(Activity.distance_km).desc())
    ).all()

    return [
        {"activity_type": activity_type, "runs": runs, "distance_km": distance_km}
        for activity_type, runs, distance_km in rows
    ]
