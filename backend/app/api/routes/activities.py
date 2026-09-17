"""Activity endpoints.

`POST /sync-garmin` is the sole data-collection path: pulls activities
directly from the Garmin Connect API into the bronze layer
(`activities_raw`), via `app.ingestion.garmin_api_loader`. No
parsing/normalization/validation happens here -- that raw-to-processed
transformation into `activities` is separate, user-owned pipeline work.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.ingestion import garmin_api_loader
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
    """Pull recent activities directly from the Garmin Connect API and
    store them in `activities_raw` (source="garmin_api"), deduplicated
    by Garmin's own activity ID. Nothing else happens here.
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

    result = garmin_api_loader.load(db, user.id, activities)
    return GarminSyncResult(
        imported=result.imported,
        skipped_duplicates=result.skipped_duplicates,
        fetched=result.fetched,
    )
