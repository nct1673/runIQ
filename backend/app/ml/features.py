"""Feature engineering for the prediction models (blueprint SS22): recent
7d/28d mileage, recent average pace/HR, long-run distance, workout
frequency/intensity, elevation, cadence, training load, days since last
hard session, recent race performance, and (when appropriate)
environmental variables.
"""
import pandas as pd


def build_feature_matrix(activities: pd.DataFrame) -> pd.DataFrame:
    raise NotImplementedError("Phase 4")
