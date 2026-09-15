"""Activity endpoints.

Two raw-only data-collection paths, both writing exclusively to the
bronze layer (`activities_raw`) -- neither runs any
parsing/normalization/validation into `activities`. That
raw-to-processed transformation is separate, user-owned pipeline work,
not something these endpoints trigger automatically.

- `POST /upload`: manual CSV export, via `app.ingestion.raw_loader`.
- `POST /sync-garmin`: live Garmin Connect API pull, via
  `app.ingestion.garmin_api_loader`.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.ingestion import garmin_api_loader, raw_loader
from app.models.activity import Activity
from app.schemas.activity import ActivityOut, GarminSyncResult, UploadResult
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


@router.post("/upload", response_model=UploadResult)
async def upload_activities(file: UploadFile, db: Session = Depends(get_db)) -> UploadResult:
    """Manual CSV import: stores every original column of every row into
    `activities_raw` (raw_loader.parse_raw -> raw_loader.load),
    deduplicated against rows already imported for this user. Nothing
    else happens here.
    """
    csv_bytes = await file.read()
    user = get_or_create_default_user(db)

    raw_full_df = raw_loader.parse_raw(csv_bytes)
    raw_result = raw_loader.load(db, user.id, raw_full_df, file.filename)

    return UploadResult(
        raw_imported=raw_result.imported,
        raw_skipped_duplicates=raw_result.skipped_duplicates,
    )


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
        activities = garmin_api_loader.fetch_activities(
            settings.garmin_email, settings.garmin_password
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Garmin login/fetch failed: {exc}") from exc

    result = garmin_api_loader.load(db, user.id, activities)
    return GarminSyncResult(
        imported=result.imported,
        skipped_duplicates=result.skipped_duplicates,
        fetched=result.fetched,
    )
