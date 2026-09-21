"""Weather intelligence endpoints (blueprint SS14-16)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db

router = APIRouter()


@router.get("/profile")
def get_weather_profile(db: Session = Depends(get_db)) -> dict:
    """The user's personal weather-performance profile -- blueprint SS15."""
    raise NotImplementedError("Phase 3: app.services.weather_service.build_profile")


@router.get("/adjusted-pace/{activity_id}")
def get_weather_adjusted_pace(activity_id: str, db: Session = Depends(get_db)) -> dict:
    """Estimated weather-adjusted pace for one activity -- blueprint SS16."""
    raise NotImplementedError("Phase 3: app.services.weather_service.adjusted_pace")
