"""Weather & conditions analytics: "how much does heat slow me down?"

The one idea behind everything here
-----------------------------------
Pace depends on effort *and* on conditions. To isolate the conditions we
fit, on EASY outdoor runs, a small linear model

    pace (s/km) = a  +  b * feels_like (degC)  +  c * (avg_hr - 140)

* b  = "heat cost": extra seconds per km for each +1 degC feels-like,
       at the same heart rate (same effort).
* c  = how pace changes per bpm of heart rate (normally negative: a higher
       heart rate means you were running faster).

From that model we derive, for every run:

* same-effort pace    = pace - c * (hr - 140)        -> "pace at 140 bpm"
* heat-adjusted pace  = pace - b * (feels_like - 28) -> "pace at 28 degC"

Honest caveat (surfaced to the UI, not hidden): if most runs happen at a
similar temperature, `b` cannot be pinned down well. We therefore return
its standard error / 95% interval and a confidence label, and monthly
slopes are only marked `reliable` with enough runs AND enough temperature
spread inside the month.

Everything is computed on demand from `activities` + `weather_conditions`;
nothing is stored. Treadmill runs have no weather and are excluded.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.weather import WeatherCondition
from app.services.analytics_service import _shift_months

REFERENCE_HR = 140.0  # bpm: "same effort" is measured at this heart rate
REFERENCE_FEELS_LIKE = 28.0  # degC: heat-adjusted pace is "as if" it were this feels-like

# "Easy run" (matches the design): mostly Zone 1-2, and a typical easy distance.
EASY_MIN_KM, EASY_MAX_KM = 3.0, 15.0
EASY_MIN_Z12_SHARE = 0.5

MIN_RUNS_FOR_MODEL = 10  # overall model needs this many easy runs...
MIN_SPREAD_FOR_MODEL_C = 3.0  # ...spanning at least this much feels-like range
MIN_MONTH_RUNS = 5  # a month's own slope needs this many easy runs...
MIN_MONTH_SPREAD_C = 3.0  # ...and this much feels-like spread within the month
MIN_MONTH_RUNS_FOR_SUMMARY = 3  # months compared in the adjusted-pace summary


@dataclass
class _Fit:
    heat: float  # b
    heat_se: float
    hr: float  # c
    r2: float
    n: int
    df: int


def _fit(runs: list[dict]) -> _Fit | None:
    """Ordinary least squares of pace on [1, feels_like, hr - 140].

    Needs >= 5 runs (3 parameters + a couple of degrees of freedom) with a
    heart rate; returns None otherwise. The standard error of `b` comes
    from the usual sigma^2 * (X'X)^-1.
    """
    usable = [r for r in runs if r["hr"] is not None]
    n = len(usable)
    if n < 5:
        return None
    X = np.column_stack(
        [np.ones(n), [r["fl"] for r in usable], [r["hr"] - REFERENCE_HR for r in usable]]
    )
    y = np.array([r["pace"] for r in usable])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    df = n - 3
    sigma2 = float(resid @ resid) / df
    cov = sigma2 * np.linalg.pinv(X.T @ X)
    ss_tot = float(((y - y.mean()) ** 2).sum())
    return _Fit(
        heat=float(beta[1]),
        heat_se=float(np.sqrt(cov[1, 1])),
        hr=float(beta[2]),
        r2=1 - float(resid @ resid) / ss_tot if ss_tot > 0 else 0.0,
        n=n,
        df=df,
    )


def _t_crit(df: int) -> float:
    from scipy import stats  # imported lazily: only needed for the 95% interval

    return float(stats.t.ppf(0.975, df))


def _confidence(fit: _Fit) -> str:
    t = abs(fit.heat) / fit.heat_se if fit.heat_se > 0 else float("inf")
    return "high" if t >= 3 else "moderate" if t >= 2 else "low"


def _month_start(d: datetime) -> date:
    return date(d.year, d.month, 1)


def get_weather_impact(db: Session, user_id: uuid.UUID, months: int = 12) -> dict:
    earliest = _shift_months(datetime.utcnow().date().replace(day=1), -(months - 1))

    rows = db.execute(
        select(Activity, WeatherCondition)
        .join(WeatherCondition, WeatherCondition.activity_id == Activity.id)
        .where(
            Activity.user_id == user_id,
            Activity.activity_type != "treadmill_running",
            Activity.started_at >= earliest,
            Activity.avg_pace_s_per_km.isnot(None),
            WeatherCondition.feels_like_c.isnot(None),
        )
        .order_by(Activity.started_at.asc())
    ).all()

    runs: list[dict] = []
    for a, w in rows:
        zone_s = [
            a.hr_time_in_zone_1, a.hr_time_in_zone_2, a.hr_time_in_zone_3,
            a.hr_time_in_zone_4, a.hr_time_in_zone_5,
        ]
        zone_total = sum(s or 0 for s in zone_s)
        z12_share = ((zone_s[0] or 0) + (zone_s[1] or 0)) / zone_total if zone_total > 0 else 0.0
        runs.append(
            {
                "id": str(a.id),
                "started_at": a.started_at,
                "hour": a.started_at.hour + a.started_at.minute / 60,
                "fl": float(w.feels_like_c),
                "temp": w.temperature_c,
                "pace": float(a.avg_pace_s_per_km),
                "hr": float(a.avg_hr) if a.avg_hr is not None else None,
                "km": float(a.distance_km),
                "easy": z12_share >= EASY_MIN_Z12_SHARE and EASY_MIN_KM <= a.distance_km <= EASY_MAX_KM,
            }
        )

    easy = [r for r in runs if r["easy"]]
    fits_ok = len(easy) >= MIN_RUNS_FOR_MODEL and (
        max((r["fl"] for r in easy), default=0) - min((r["fl"] for r in easy), default=0) >= MIN_SPREAD_FOR_MODEL_C
    )
    fit = _fit(easy) if fits_ok else None

    model = None
    reason = None
    if fit is None:
        reason = (
            f"Needs at least {MIN_RUNS_FOR_MODEL} easy outdoor runs spanning "
            f"{MIN_SPREAD_FOR_MODEL_C:.0f}°C of feels-like temperature."
        )
    else:
        half = _t_crit(fit.df) * fit.heat_se
        fl_values = [r["fl"] for r in easy if r["hr"] is not None]
        model = {
            "heat_s_per_km_per_c": fit.heat,
            "heat_se": fit.heat_se,
            "ci_low": fit.heat - half,
            "ci_high": fit.heat + half,
            "hr_s_per_km_per_bpm": fit.hr,
            "r2": fit.r2,
            "n": fit.n,
            "confidence": _confidence(fit),
            "feels_like_min": min(fl_values),
            "feels_like_max": max(fl_values),
            "mean_feels_like_c": float(np.mean(fl_values)),
            "mean_same_effort_pace_s_per_km": float(
                np.mean([r["pace"] - fit.hr * (r["hr"] - REFERENCE_HR) for r in easy if r["hr"] is not None])
            ),
        }

    points = []
    for r in runs:
        same_effort = r["pace"] - fit.hr * (r["hr"] - REFERENCE_HR) if fit and r["hr"] is not None else None
        adjusted = r["pace"] - fit.heat * (r["fl"] - REFERENCE_FEELS_LIKE) if fit else None
        r["adjusted"] = adjusted
        points.append(
            {
                "activity_id": r["id"],
                "started_at": r["started_at"],
                "hour": r["hour"],
                "feels_like_c": r["fl"],
                "temperature_c": r["temp"],
                "pace_s_per_km": r["pace"],
                "avg_hr": r["hr"],
                "distance_km": r["km"],
                "easy": r["easy"],
                "same_effort_pace_s_per_km": same_effort,
                "heat_adjusted_pace_s_per_km": adjusted,
            }
        )

    monthly = _monthly_heat_cost(easy)
    return {
        "months": months,
        "reference_hr_bpm": REFERENCE_HR,
        "reference_feels_like_c": REFERENCE_FEELS_LIKE,
        "outdoor_runs": len(runs),
        "easy_runs": len(easy),
        "model": model,
        "model_unavailable_reason": reason,
        "runs": points,
        "monthly": monthly,
        "weekly": _weekly_adjusted(easy) if fit else [],
        "adjusted_summary": _adjusted_summary(easy) if fit else None,
    } | _with_change(monthly)


def _with_change(monthly: list[dict]) -> dict:
    """Change in heat cost between the first and last *reliable* month."""
    reliable = [m for m in monthly if m["reliable"]]
    if len(reliable) < 2:
        return {"heat_cost_change": None}
    first, last = reliable[0], reliable[-1]
    if not first["slope_s_per_km_per_c"]:
        return {"heat_cost_change": None}
    # Each monthly slope is itself an estimate. If either one is within ~2
    # standard errors of zero, the "change between them" is not trustworthy.
    noisy = any(abs(m["slope_s_per_km_per_c"]) < 2 * m["se"] for m in (first, last))
    return {
        "heat_cost_change": {
            "from_month": first["month"],
            "to_month": last["month"],
            "from_value": first["slope_s_per_km_per_c"],
            "to_value": last["slope_s_per_km_per_c"],
            "pct_change": (last["slope_s_per_km_per_c"] - first["slope_s_per_km_per_c"])
            / abs(first["slope_s_per_km_per_c"])
            * 100,
            "confidence": "low" if noisy else "ok",
        }
    }


def _monthly_heat_cost(easy: list[dict]) -> list[dict]:
    """The heat slope `b` fitted separately inside each calendar month.

    A month is `reliable` only with >= MIN_MONTH_RUNS easy runs that have a
    heart rate AND >= MIN_MONTH_SPREAD_C of feels-like spread; without the
    spread there is nothing to measure a slope against.
    """
    by_month: dict[date, list[dict]] = defaultdict(list)
    for r in easy:
        by_month[_month_start(r["started_at"])].append(r)

    out = []
    for month in sorted(by_month):
        group = by_month[month]
        with_hr = [r for r in group if r["hr"] is not None]
        spread = (max(r["fl"] for r in group) - min(r["fl"] for r in group)) if group else None
        slope = se = None
        why = None
        if len(with_hr) < MIN_MONTH_RUNS:
            why = f"fewer than {MIN_MONTH_RUNS} easy outdoor runs"
        elif spread is None or spread < MIN_MONTH_SPREAD_C:
            why = f"under {MIN_MONTH_SPREAD_C:.0f}°C of feels-like variation"
        else:
            f = _fit(with_hr)
            if f is not None:
                slope, se = f.heat, f.heat_se
            else:
                why = "not enough data to fit"
        out.append(
            {
                "month": month,
                "runs": len(group),
                "spread_c": spread,
                "slope_s_per_km_per_c": slope,
                "se": se,
                "reliable": slope is not None,
                "reason": why,
            }
        )
    return out


def _week_start(d: datetime) -> date:
    day = d.date()
    return day - timedelta(days=day.weekday())


def _weekly_adjusted(easy: list[dict]) -> list[dict]:
    """Mean actual vs heat-adjusted pace per week (easy runs only)."""
    by_week: dict[date, list[dict]] = defaultdict(list)
    for r in easy:
        if r["adjusted"] is not None:
            by_week[_week_start(r["started_at"])].append(r)
    return [
        {
            "week_start": week,
            "runs": len(g),
            "actual_pace_s_per_km": float(np.mean([r["pace"] for r in g])),
            "adjusted_pace_s_per_km": float(np.mean([r["adjusted"] for r in g])),
        }
        for week, g in sorted(by_week.items())
    ]


def _adjusted_summary(easy: list[dict]) -> dict | None:
    """First vs last month (each with >= 3 easy runs): how much of the
    change in actual pace is real (heat-adjusted) vs weather."""
    by_month: dict[date, list[dict]] = defaultdict(list)
    for r in easy:
        if r["adjusted"] is not None:
            by_month[_month_start(r["started_at"])].append(r)
    months = [m for m in sorted(by_month) if len(by_month[m]) >= MIN_MONTH_RUNS_FOR_SUMMARY]
    if len(months) < 2:
        return None
    first, last = months[0], months[-1]
    mean = lambda m, k: float(np.mean([r[k] for r in by_month[m]]))  # noqa: E731
    actual_from, actual_to = mean(first, "pace"), mean(last, "pace")
    adj_from, adj_to = mean(first, "adjusted"), mean(last, "adjusted")
    return {
        "from_month": first,
        "to_month": last,
        "actual_from": actual_from,
        "actual_to": actual_to,
        "adjusted_from": adj_from,
        "adjusted_to": adj_to,
        # Positive = weather made the actual improvement look bigger than the real one.
        "weather_share_s": (actual_from - actual_to) - (adj_from - adj_to),
    }
