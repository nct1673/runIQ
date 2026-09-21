"""Activity endpoints.

`POST /sync-garmin` runs the full pipeline in one request: pulls
activities from the Garmin Connect API into the bronze layer
(`activities_raw`) via `app.ingestion.garmin_api_loader`, then
immediately runs the raw-to-processed pipeline
(`app.ingestion.processor`) so `activities`/`weather_conditions` are
populated in the same "Update Data" press -- no separate manual step.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.ingestion import garmin_api_loader, processor
from app.models.activity import Activity
from app.schemas.activity import ActivityOut, GarminSyncResult
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("/", response_model=list[ActivityOut])
def list_activities(db: Session = Depends(get_db)) -> list[ActivityOut]:
    """List imported (processed) activities, most recent first. Empty
    until something populates `activities` from `activities_raw`."""
    user = get_or_create_default_user(db)
    return db.scalars(
        select(Activity).where(Activity.user_id == user.id).order_by(Activity.started_at.desc())
    ).all()


@router.post("/sync-garmin", response_model=GarminSyncResult)
def sync_garmin(db: Session = Depends(get_db)) -> GarminSyncResult:
    """Pull recent activities from the Garmin Connect API into
    `activities_raw` (source="garmin_api", deduplicated by Garmin's own
    activity ID), then immediately run the raw-to-processed pipeline so
    `activities`/`weather_conditions` are populated too -- see
    app.ingestion.processor. A sync with no new Garmin activities skips
    the second stage's work entirely (nothing new to process).
    """
    settings = get_settings()
    if not settings.garmin_email or not settings.garmin_password:
        raise HTTPException(status_code=500, detail="GARMIN_EMAIL/GARMIN_PASSWORD not configured")

    user = get_or_create_default_user(db)

    try:
        activities = garmin_api_loader.fetch_new_activities(
            db, user.id, settings.garmin_email, settings.garmin_password
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Garmin login/fetch failed: {exc}") from exc

    raw_result = garmin_api_loader.load(db, user.id, activities)
    process_result = processor.process_new_activities(db, user.id)

    return GarminSyncResult(
        fetched=raw_result.fetched,
        imported=raw_result.imported,
        skipped_duplicates=raw_result.skipped_duplicates,
        processed=process_result.processed,
        skipped_non_running=process_result.skipped_non_running,
        weather_matched=process_result.weather_matched,
        rejected=process_result.rejected,
        rejection_reasons=process_result.rejection_reasons,
    )
