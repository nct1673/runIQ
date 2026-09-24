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


def get_pace_trend(db: Session, user_id: uuid.UUID, limit: int = 12) -> list[dict]:
    """The last `limit` runs' pace, oldest to newest, for a trend line --
    only runs with a known pace (avg_pace_s_per_km is nullable on
    Activity for e.g. malformed rows).
    """
    rows = db.execute(
        select(Activity)
        .where(Activity.user_id == user_id, Activity.avg_pace_s_per_km.is_not(None))
        .order_by(Activity.started_at.desc())
        .limit(limit)
    ).scalars().all()

    return [
        {
            "activity_id": str(a.id),
            "started_at": a.started_at,
            "avg_pace_s_per_km": a.avg_pace_s_per_km,
            "distance_km": a.distance_km,
        }
        for a in reversed(rows)
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
