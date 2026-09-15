"""Race-performance prediction endpoints (blueprint SS21-25)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db

router = APIRouter()


@router.get("/{distance_label}")
def get_prediction(distance_label: str, db: Session = Depends(get_db)) -> dict:
    """Latest prediction + range + explanation for one race distance."""
    raise NotImplementedError("Phase 4: app.services.prediction_service.predict")
