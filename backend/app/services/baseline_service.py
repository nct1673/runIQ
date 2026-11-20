"""Personal baseline (blueprint SS12) -- the "You vs. Yourself" reference
point: typical easy pace, HR, cadence, weekly volume, long-run distance and
how much of the training is easy. Everything else (the Form tab, run detail,
the AI coach) compares against this rather than population norms.

Method (see docs/personal_baseline_notes.md for the reasoning):
- Window: the last 8 weeks (WINDOW_WEEKS). Old fitness shouldn't drag the
  baseline, so it is rolling, never all-time.
- Pace / HR / cadence come from *easy road runs* only: Garmin's
  AEROBIC_BASE label (the same filter the trend charts use) on outdoor
  `running` activities. Hard efforts and races would skew "typical" fast, and
  treadmill pace isn't comparable to GPS pace.
- Medians, not means, with a personal range (10th-90th percentile): one
  hot day or GPS glitch barely moves a median.
- Weekly distance is the median of whole-week totals over the 8 complete
  weeks before this one (the current week is still partial); weeks with no
  run count as 0. Treadmill runs count here, since volume is volume.
- Long run is the 75th percentile of each of those weeks' longest run,
  over weeks that had a run.
- Cold start: nothing is reported until the readiness thresholds are met
  (REQUIRED_* below), rather than showing a shaky average of two runs.
"""
from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity

WINDOW_WEEKS = 8
EASY_LABEL = "AEROBIC_BASE"
ROAD_TYPE = "running"

# Readiness thresholds; the Personal baseline card shows these as its checklist.
# 10 samples is about the least that makes a 10th-90th percentile range meaningful;
# the last-4-weeks check keeps the baseline about *current* running, not old runs.
REQUIRED_HR_RUNS = 10  # easy road runs with heart-rate data in the window
REQUIRED_EASY_RUNS_LAST_4_WEEKS = 4


def _spread(values: list[float], digits: int = 1) -> dict | None:
    """Typical value (median) and personal range (10th-90th percentile)."""
    if not values:
        return None
    p10, median, p90 = np.percentile(values, [10, 50, 90])
    return {
        "typical": round(float(median), digits),
        "low": round(float(p10), digits),
        "high": round(float(p90), digits),
    }


def compute_baseline(db: Session, user_id: uuid.UUID, now: datetime | None = None) -> dict:
    now = now or datetime.utcnow()
    today = now.date()
    this_week = today - timedelta(days=today.weekday())
    window_start = now - timedelta(weeks=WINDOW_WEEKS)
    first_week = this_week - timedelta(weeks=WINDOW_WEEKS)  # Monday of the oldest volume week

    # Fetch from the volume weeks' start (never later than window_start), then
    # restrict the easy-run stats to the rolling window itself.
    fetched = list(
        db.execute(
            select(Activity)
            .where(Activity.user_id == user_id, Activity.started_at >= datetime.combine(first_week, time.min))
            .order_by(Activity.started_at.asc())
        ).scalars()
    )
    runs = [a for a in fetched if a.started_at >= window_start]

    easy_road = [a for a in runs if a.training_effect_label == EASY_LABEL and a.activity_type == ROAD_TYPE]
    easy_with_pace = [a for a in easy_road if a.avg_pace_s_per_km]
    easy_with_hr = [a for a in easy_road if a.avg_hr]
    easy_with_cadence = [a for a in easy_road if a.avg_cadence]
    easy_last_4_weeks = [a for a in easy_road if a.started_at >= now - timedelta(weeks=4)]

    requirements = {
        "hr_runs": len(easy_with_hr),
        "hr_runs_required": REQUIRED_HR_RUNS,
        "has_running_dynamics": len(easy_with_cadence) > 0,
        "easy_runs_last_4_weeks": len(easy_last_4_weeks),
        "easy_runs_last_4_weeks_required": REQUIRED_EASY_RUNS_LAST_4_WEEKS,
    }
    ready = (
        requirements["hr_runs"] >= REQUIRED_HR_RUNS
        and requirements["has_running_dynamics"]
        and requirements["easy_runs_last_4_weeks"] >= REQUIRED_EASY_RUNS_LAST_4_WEEKS
    )
    result: dict = {
        "ready": ready,
        "window_weeks": WINDOW_WEEKS,
        "requirements": requirements,
        "easy_runs_used": len(easy_road),
        "easy_pace_s_per_km": None,
        "easy_hr": None,
        "easy_cadence": None,
        "weekly_km": None,
        "long_run_km": None,
        "easy_share_pct": None,
    }
    if not ready:
        return result

    result["easy_pace_s_per_km"] = _spread([a.avg_pace_s_per_km for a in easy_with_pace])
    result["easy_hr"] = _spread([a.avg_hr for a in easy_with_hr], digits=0)
    result["easy_cadence"] = _spread([a.avg_cadence for a in easy_with_cadence], digits=0)

    # Volume: the 8 complete weeks before the current (partial) one.
    week_km = {first_week + timedelta(weeks=i): 0.0 for i in range(WINDOW_WEEKS)}
    week_longest = {week: 0.0 for week in week_km}
    for a in fetched:
        week = a.started_at.date() - timedelta(days=a.started_at.weekday())
        if week in week_km:
            week_km[week] += a.distance_km
            week_longest[week] = max(week_longest[week], a.distance_km)
    result["weekly_km"] = _spread(list(week_km.values()))
    result["long_run_km"] = _spread([km for km in week_longest.values() if km > 0], digits=1)
    if result["long_run_km"]:
        # Typical long run = upper end of the weekly longest runs, not the median.
        result["long_run_km"]["typical"] = round(
            float(np.percentile([km for km in week_longest.values() if km > 0], 75)), 1
        )

    labelled = [a for a in runs if a.training_effect_label]
    if labelled:
        easy_count = sum(1 for a in labelled if a.training_effect_label == EASY_LABEL)
        result["easy_share_pct"] = round(100 * easy_count / len(labelled))

    return result
