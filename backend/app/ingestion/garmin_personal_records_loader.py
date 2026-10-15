"""Fetch personal records from the Garmin Connect API
(`garminconnect.Garmin.get_personal_record()`).

Garmin's PR list spans every stat it tracks per user (steps/floors/
intensity minutes/etc, not just running), keyed by an internal `typeId`
with no label in the response itself -- KNOWN_TYPES below is the
reverse-engineered subset that matters for a running app: fastest time
over a fixed distance, plus longest single run. Anything else in the
response (unknown typeId) is dropped rather than guessed at.
"""
from __future__ import annotations

from datetime import datetime

from garminconnect import Garmin

TOKEN_STORE = "~/.garminconnect"

# Garmin's PR typeId -> (human label, metric). metric "time_s" means
# `value` is a duration in seconds (fastest-time PRs); "distance_m" means
# `value` is a distance in meters (longest-run PR).
KNOWN_TYPES: dict[int, tuple[str, str]] = {
    1: ("1 km", "time_s"),
    2: ("1 mile", "time_s"),
    3: ("5 km", "time_s"),
    4: ("10 km", "time_s"),
    5: ("Half Marathon", "time_s"),
    6: ("Marathon", "time_s"),
    7: ("Longest Run", "distance_m"),
}


def _parse_achieved_at(record: dict) -> datetime | None:
    raw = record.get("activityStartDateTimeLocalFormatted") or record.get("actStartDateTimeInGMTFormatted")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def fetch_personal_records(email: str, password: str) -> list[dict]:
    """Log into Garmin Connect (reusing the cached token at TOKEN_STORE
    when valid, otherwise a fresh email/password login) and return the
    running-relevant personal records, one dict per known type_id.
    """
    client = Garmin(email, password)
    try:
        client.login(TOKEN_STORE)
    except Exception:
        client.login()

    records = client.get_personal_record() or []

    parsed = []
    for r in records:
        type_id = r.get("typeId")
        known = KNOWN_TYPES.get(type_id)
        if known is None:
            continue
        label, metric = known
        parsed.append(
            {
                "type_id": type_id,
                "label": label,
                "metric": metric,
                "value": r["value"],
                "garmin_activity_id": r.get("activityId"),
                "activity_name": r.get("activityName"),
                "achieved_at": _parse_achieved_at(r),
            }
        )
    return parsed
