"""Parse a Garmin Connect bulk-export CSV into a raw pandas DataFrame.

Transport-agnostic by design: this module doesn't know whether the CSV
came from a frontend upload (today) or a future automated Garmin/Strava
API sync -- it just takes bytes and returns a DataFrame.

Column mapping confirmed against the real export
(`data/sample/activities.csv`, Garmin Connect's "Activities.csv"
bulk-export format). Garmin renders missing values as the literal string
"--", which `na_values` below turns into real NaNs.
"""
from __future__ import annotations

import io

import pandas as pd

COLUMN_MAP = {
    "Activity Type": "activity_type",
    "Date": "started_at",
    "Distance": "distance_km",
    "Time": "duration_str",
    "Avg HR": "avg_hr",
    "Avg Run Cadence": "avg_cadence",
    "Avg Pace": "avg_pace_str",
    "Total Ascent": "elevation_gain_m",
}


def parse(csv_bytes: bytes) -> pd.DataFrame:
    """Read raw CSV bytes, keep only the columns RunIQ cares about, and
    rename them to RunIQ's internal schema. Does NOT convert units/types
    or filter by activity type -- see normalizer.py.
    """
    df = pd.read_csv(io.BytesIO(csv_bytes), na_values=["--"])
    missing = [c for c in COLUMN_MAP if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing expected Garmin export columns: {missing}")
    return df[list(COLUMN_MAP.keys())].rename(columns=COLUMN_MAP)
