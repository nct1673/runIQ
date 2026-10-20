"""Personal-records endpoints -- list what's synced, and trigger a fresh
sync from Garmin Connect. See app.services.personal_record_service.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.schemas.personal_record import PersonalRecordOut
from app.services import personal_record_service
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("", response_model=list[PersonalRecordOut])
def list_personal_records(db: Session = Depends(get_db)) -> list[PersonalRecordOut]:
    """Currently-synced personal bests, soonest-distance-first."""
    user = get_or_create_default_user(db)
    return personal_record_service.list_personal_records(db, user.id)


@router.post("/sync", response_model=list[PersonalRecordOut])
def sync_personal_records(db: Session = Depends(get_db)) -> list[PersonalRecordOut]:
    """Pull current PRs from Garmin Connect and upsert them -- see
    app.ingestion.garmin_personal_records_loader.KNOWN_TYPES for which
    of Garmin's PR categories are running-relevant and get synced."""
    settings = get_settings()
    if not settings.garmin_email or not settings.garmin_password:
        raise HTTPException(status_code=500, detail="GARMIN_EMAIL/GARMIN_PASSWORD not configured")

    user = get_or_create_default_user(db)
    try:
        return personal_record_service.sync_from_garmin(
            db, user.id, settings.garmin_email, settings.garmin_password
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Garmin login/fetch failed: {exc}") from exc
