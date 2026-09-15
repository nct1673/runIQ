"""Normalize parsed activity rows: unit conversion, timestamp/duration/
pace parsing, activity-type filtering, and dedup-key generation
(blueprint §8 "Data Normalization").

Only "Running" and "Treadmill Running" are running-intelligence relevant
(project decision) -- everything else in a Garmin export (Hiking,
Strength Training, Padel, ...) is filtered out here and reported back as
skipped, never stored.
"""
from __future__ import annotations

import hashlib

import pandas as pd

RUNNING_ACTIVITY_TYPES = {"Running", "Treadmill Running"}


def _parse_duration_to_seconds(value: str) -> float:
    """"HH:MM:SS" -> seconds."""
    hours, minutes, seconds = value.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _parse_pace_to_seconds_per_km(value) -> float | None:
    """"M:SS" (minutes:seconds per km) -> seconds per km. Already NaN by
    this point for activities where Garmin has no meaningful pace."""
    if pd.isna(value):
        return None
    minutes, seconds = str(value).split(":")
    return int(minutes) * 60 + float(seconds)


def _external_id(row: pd.Series) -> str:
    """Deterministic dedup key. Garmin's bulk CSV export has no stable
    activity-ID column, so we derive one from fields that together
    uniquely identify a real activity -- re-uploading the same (or an
    overlapping) export won't create duplicate rows.
    """
    key = (
        f"{row['started_at'].isoformat()}|{row['distance_km']}|"
        f"{row['duration_s']}|{row['activity_type']}"
    )
    return hashlib.sha1(key.encode()).hexdigest()


def normalize(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Returns (normalized_df, skipped_non_running_count).

    `normalized_df` columns match `app.models.Activity` plus
    `external_id`; rows are not yet validated -- see validators.py.
    """
    total = len(df)
    df = df[df["activity_type"].isin(RUNNING_ACTIVITY_TYPES)].copy()
    skipped_non_running = total - len(df)

    df["started_at"] = pd.to_datetime(df["started_at"], errors="coerce")
    df["distance_km"] = pd.to_numeric(df["distance_km"], errors="coerce")
    df["duration_s"] = df["duration_str"].apply(
        lambda v: _parse_duration_to_seconds(v) if pd.notna(v) else None
    )
    df["avg_pace_s_per_km"] = df["avg_pace_str"].apply(_parse_pace_to_seconds_per_km)
    df["avg_hr"] = pd.to_numeric(df["avg_hr"], errors="coerce")
    df["avg_cadence"] = pd.to_numeric(df["avg_cadence"], errors="coerce")
    df["elevation_gain_m"] = pd.to_numeric(df["elevation_gain_m"], errors="coerce")
    df["external_id"] = df.apply(_external_id, axis=1)

    columns = [
        "external_id",
        "activity_type",
        "started_at",
        "distance_km",
        "duration_s",
        "avg_pace_s_per_km",
        "avg_hr",
        "avg_cadence",
        "elevation_gain_m",
    ]
    return df[columns].reset_index(drop=True), skipped_non_running
