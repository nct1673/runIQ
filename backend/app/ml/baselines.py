"""Naive baselines to beat before trusting any ML model (blueprint SS23):
naive baseline, historical best, moving average, linear regression.
"""
import pandas as pd


def naive_baseline(history: pd.Series) -> float:
    raise NotImplementedError("Phase 4")


def historical_best(history: pd.Series) -> float:
    raise NotImplementedError("Phase 4")


def moving_average(history: pd.Series, window: int = 5) -> float:
    raise NotImplementedError("Phase 4")
