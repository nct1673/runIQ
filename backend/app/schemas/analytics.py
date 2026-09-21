"""Pydantic response schemas for the analytics API."""
from pydantic import BaseModel


class SummaryOut(BaseModel):
    total_runs: int
    total_distance_km: float
    total_duration_s: float
