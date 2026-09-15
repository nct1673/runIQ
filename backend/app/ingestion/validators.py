"""Validate normalized activity rows before load (blueprint §8 "Data
Validation": missing/invalid timestamps, invalid distance/duration,
unrealistic HR/cadence).

Runs AFTER normalization, not before -- pandera range checks are far
simpler against already-typed numeric columns than against raw Garmin
export strings like "6:36" or "--".
"""
from __future__ import annotations

import pandas as pd
import pandera as pa
from pandera.typing import Series


class NormalizedActivitySchema(pa.DataFrameModel):
    distance_km: Series[float] = pa.Field(gt=0, le=200)
    duration_s: Series[float] = pa.Field(gt=0)
    avg_hr: Series[float] = pa.Field(ge=30, le=230, nullable=True)
    avg_cadence: Series[float] = pa.Field(ge=60, le=260, nullable=True)

    class Config:
        coerce = True


def validate(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Returns (valid_rows, human-readable rejection reasons).

    Every rejected row is reported by its `external_id` rather than a
    positional index, since the caller only sees the final counts/reasons
    -- not the intermediate DataFrame.
    """
    df = df.reset_index(drop=True)
    reasons: list[str] = []

    missing_timestamp = df["started_at"].isna()
    for external_id in df.loc[missing_timestamp, "external_id"]:
        reasons.append(f"external_id={external_id}: missing/invalid timestamp")
    df = df[~missing_timestamp].reset_index(drop=True)

    try:
        NormalizedActivitySchema.validate(df, lazy=True)
        return df, reasons
    except pa.errors.SchemaErrors as err:
        failure_cases = err.failure_cases
        bad_positions = {int(i) for i in failure_cases["index"].dropna()}
        for _, case in failure_cases.iterrows():
            pos = case["index"]
            external_id = (
                df.loc[int(pos), "external_id"] if pos is not None and int(pos) in df.index else "unknown"
            )
            reasons.append(
                f"external_id={external_id}: {case['column']} failed "
                f"'{case['check']}' (value={case['failure_case']})"
            )
        valid_df = df.drop(index=list(bad_positions)).reset_index(drop=True)
        return valid_df, reasons
