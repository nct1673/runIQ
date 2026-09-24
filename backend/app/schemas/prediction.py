"""Pydantic response schemas for the predictions API."""
from pydantic import BaseModel


class PredictionOut(BaseModel):
    distance_label: str  # "5K" | "10K" | "half_marathon" | "marathon"
    predicted_time_s: float
    range_low_s: float | None = None
    range_high_s: float | None = None
    confidence: str | None = None
    model_version: str | None = None
