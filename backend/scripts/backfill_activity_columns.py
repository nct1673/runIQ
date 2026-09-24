"""One-off backfill: fill the widened Activity columns (see
app.models.activity, app.ingestion.normalizer) on rows that were loaded
before that mapping existed.

Only touches the new columns -- id, external_id, started_at, and the
original 7 fields are left as-is, and weather_conditions isn't touched
(no new OpenWeather calls). Matches each existing Activity back to its
source ActivityRaw row via external_id == str(garmin_activity_id), the
same key app.ingestion.processor uses.

Run once: python -m scripts.backfill_activity_columns
"""
from __future__ import annotations

from app.core.db import SessionLocal
from app.ingestion import normalizer
from app.models.activity import Activity
from app.models.activity_raw import ActivityRaw

NEW_FIELDS = [
    "raw_imported_at",
    "activity_name",
    "event_type",
    "elapsed_duration_s",
    "moving_duration_s",
    "calories",
    "avg_power",
    "norm_power",
    "avg_stride_length",
    "avg_vertical_oscillation",
    "avg_vertical_ratio",
    "avg_ground_contact_time",
    "start_latitude",
    "start_longitude",
    "training_effect_label",
    "vo2_max",
    "hr_time_in_zone_1",
    "hr_time_in_zone_2",
    "hr_time_in_zone_3",
    "hr_time_in_zone_4",
    "hr_time_in_zone_5",
    "power_time_in_zone_1",
    "power_time_in_zone_2",
    "power_time_in_zone_3",
    "power_time_in_zone_4",
    "power_time_in_zone_5",
    "location",
    "pace",
]


def run() -> None:
    db = SessionLocal()
    try:
        raw_by_garmin_id = {
            str(r.garmin_activity_id): r
            for r in db.query(ActivityRaw).all()
            if r.garmin_activity_id is not None
        }

        updated = 0
        skipped_no_raw = 0
        skipped_not_running = 0

        for activity in db.query(Activity).all():
            raw = raw_by_garmin_id.get(activity.external_id)
            if raw is None:
                skipped_no_raw += 1
                continue

            fields = normalizer.normalize_one(raw)
            if fields is None:
                skipped_not_running += 1
                continue

            for key in NEW_FIELDS:
                setattr(activity, key, fields.get(key))
            updated += 1

        db.commit()
        print(
            f"updated={updated} skipped_no_raw={skipped_no_raw} "
            f"skipped_not_running={skipped_not_running}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    run()
