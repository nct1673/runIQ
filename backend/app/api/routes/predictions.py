"""Race-performance prediction endpoints (blueprint SS21-25)."""
from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.prediction import PredictionOut
from app.services import prediction_service

router = APIRouter()


@router.get("", response_model=list[PredictionOut])
def list_predictions() -> list[PredictionOut]:
    """5K/10K/half/marathon predictions -- currently Garmin's own
    predictor, see prediction_service for why."""
    settings = get_settings()
    if not settings.garmin_email or not settings.garmin_password:
        raise HTTPException(status_code=500, detail="GARMIN_EMAIL/GARMIN_PASSWORD not configured")

    try:
        return prediction_service.get_all_predictions(settings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Garmin login/fetch failed: {exc}") from exc


@router.get("/{distance_label}", response_model=PredictionOut)
def get_prediction(distance_label: str) -> PredictionOut:
    """Latest prediction for one race distance."""
    settings = get_settings()
    if not settings.garmin_email or not settings.garmin_password:
        raise HTTPException(status_code=500, detail="GARMIN_EMAIL/GARMIN_PASSWORD not configured")

    try:
        prediction = prediction_service.get_prediction(settings, distance_label)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Garmin login/fetch failed: {exc}") from exc

    if prediction is None:
        raise HTTPException(status_code=404, detail=f"No prediction available for {distance_label!r}")
    return prediction
