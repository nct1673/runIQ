"""Load validated, normalized activity rows into Postgres, skipping any
that already exist (matched by `external_id`) for this user.

Deliberately separate from validators.py/normalizer.py: this is the only
module in `app.ingestion` that touches the database.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity


@dataclass
class LoadResult:
    imported: int
    skipped_duplicates: int
    imported_ids: list[str] = field(default_factory=list)


def load(db: Session, user_id: uuid.UUID, df: pd.DataFrame) -> LoadResult:
    """Insert `df` (as produced by normalizer.normalize + validators.validate)
    for `user_id`, skipping rows whose `external_id` already exists for
    that user. Commits on success.
    """
    if df.empty:
        return LoadResult(imported=0, skipped_duplicates=0)

    existing_ids = set(
        db.scalars(
            select(Activity.external_id).where(
                Activity.user_id == user_id,
                Activity.external_id.in_(df["external_id"].tolist()),
            )
        )
    )

    new_rows = df[~df["external_id"].isin(existing_ids)]
    skipped_duplicates = len(df) - len(new_rows)

    objects = [
        Activity(
            user_id=user_id,
            source="garmin_csv_upload",
            external_id=row["external_id"],
            started_at=row["started_at"],
            distance_km=row["distance_km"],
            duration_s=row["duration_s"],
            avg_pace_s_per_km=row["avg_pace_s_per_km"],
            avg_hr=row["avg_hr"],
            avg_cadence=row["avg_cadence"],
            elevation_gain_m=row["elevation_gain_m"],
            activity_type=row["activity_type"],
        )
        for _, row in new_rows.iterrows()
    ]

    db.add_all(objects)
    db.flush()  # populate each object's client-side UUID default before we read .id
    imported_ids = [str(obj.id) for obj in objects]
    db.commit()

    return LoadResult(
        imported=len(objects),
        skipped_duplicates=skipped_duplicates,
        imported_ids=imported_ids,
    )
