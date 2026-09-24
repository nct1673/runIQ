"""Race-time predictions (blueprint SS21-25).

Stopgap: proxies Garmin Connect's own race predictor (VO2max/training-
history based, computed server-side by Garmin -- see mwcolem/
RunningDashboard's garmin_client.get_race_predictions for the same
pattern) instead of RunIQ's own model. The real model lives in
app.ml (features.py/baselines.py/train.py/evaluate.py per the
blueprint) and is still Phase 4 -- unbuilt. Swap this out once that
pipeline produces predictions with a real range/confidence/
model_version worth showing; until then range/confidence stay None
since Garmin's predictor is a black box RunIQ has no visibility into.
"""
from garminconnect import Garmin

from app.core.config import Settings

TOKEN_STORE = "~/.garminconnect"

# RunIQ's distance_label -> the matching field on Garmin's response.
DISTANCE_FIELDS = {
    "5K": "time5K",
    "10K": "time10K",
    "half_marathon": "timeHalfMarathon",
    "marathon": "timeMarathon",
}


def _login(settings: Settings) -> Garmin:
    client = Garmin(settings.garmin_email, settings.garmin_password)
    try:
        client.login(TOKEN_STORE)  # reuse the cached session token when valid
    except Exception:
        client.login()
    return client


def get_all_predictions(settings: Settings) -> list[dict]:
    """Current 5K/10K/half/marathon predictions from Garmin, mapped into
    RunIQ's prediction shape. Distances Garmin hasn't got enough data
    for come back as None and are dropped.
    """
    client = _login(settings)
    data = client.get_race_predictions()

    return [
        {
            "distance_label": label,
            "predicted_time_s": data[field],
            "range_low_s": None,
            "range_high_s": None,
            "confidence": None,
            "model_version": "garmin_race_predictor",
        }
        for label, field in DISTANCE_FIELDS.items()
        if data.get(field) is not None
    ]


def get_prediction(settings: Settings, distance_label: str) -> dict | None:
    return next(
        (p for p in get_all_predictions(settings) if p["distance_label"] == distance_label),
        None,
    )
