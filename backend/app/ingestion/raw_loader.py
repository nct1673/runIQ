"""Load a Garmin export CSV into `activities_raw` (bronze layer),
independent of the `activities` (processed) pipeline in csv_parser.py /
normalizer.py / validators.py / loader.py -- this module reads every
original column, unfiltered and unconverted, and only removes rows that
were already imported before.
"""
from __future__ import annotations

import hashlib
import io
import uuid
from dataclasses import dataclass

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity_raw import RAW_COLUMN_MAP, ActivityRaw


def parse_raw(csv_bytes: bytes) -> pd.DataFrame:
    """Read the CSV keeping every original Garmin column name, dropping
    only columns RunIQ doesn't have a mapping for."""
    df = pd.read_csv(io.BytesIO(csv_bytes))
    present = [c for c in RAW_COLUMN_MAP if c in df.columns]
    return df[present]


def _row_hash(row: pd.Series) -> str:
    """Deterministic hash of a raw row's values (in a fixed column
    order), used to detect rows that were already imported -- e.g. the
    same export re-uploaded, or two exports whose date ranges overlap.
    """
    parts = [str(row[col]) if col in row and pd.notna(row[col]) else "" for col in RAW_COLUMN_MAP]
    return hashlib.sha1("|".join(parts).encode()).hexdigest()


def remove_duplicates(db: Session, user_id: uuid.UUID, df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Split `df` into (new_rows, skipped_duplicate_count) by checking
    each row's hash against what's already stored in `activities_raw`
    for this user.
    """
    df = df.copy()
    df["row_hash"] = df.apply(_row_hash, axis=1)

    existing_hashes = set(
        db.scalars(
            select(ActivityRaw.row_hash).where(
                ActivityRaw.user_id == user_id,
                ActivityRaw.row_hash.in_(df["row_hash"].tolist()),
            )
        )
    )

    new_rows = df[~df["row_hash"].isin(existing_hashes)]
    skipped_duplicates = len(df) - len(new_rows)
    return new_rows, skipped_duplicates


@dataclass
class RawLoadResult:
    imported: int
    skipped_duplicates: int


def load(db: Session, user_id: uuid.UUID, df: pd.DataFrame, source_file: str | None) -> RawLoadResult:
    """Deduplicate `df` against existing raw rows, then insert what's new."""
    new_rows, skipped_duplicates = remove_duplicates(db, user_id, df)

    objects = [
        ActivityRaw(
            user_id=user_id,
            source="csv_upload",
            source_file=source_file,
            row_hash=row["row_hash"],
            **{
                attr: (None if pd.isna(row.get(csv_col)) else str(row.get(csv_col)))
                for csv_col, attr in RAW_COLUMN_MAP.items()
            },
        )
        for _, row in new_rows.iterrows()
    ]
    db.add_all(objects)
    db.commit()

    return RawLoadResult(imported=len(objects), skipped_duplicates=skipped_duplicates)
