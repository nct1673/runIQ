"""Race performance prediction (blueprint SS21-25): 5K/10K/half-marathon
time prediction from historical training features. Model strategy starts
with naive/historical-best/moving-average baselines, then classical ML
(ElasticNet/Random Forest/XGBoost/LightGBM) -- no deep learning given the
~150-run dataset size (blueprint SS23). Must use time-series validation
(blueprint SS24) and report a range + confidence, not a false-precision
point estimate (blueprint SS21), plus SHAP-based explainability
(blueprint SS25).
"""


def predict(user_id, distance_label: str) -> dict:
    raise NotImplementedError(
        "Phase 4: load trained model, build features, predict + range + drivers"
    )


def train(user_id) -> None:
    raise NotImplementedError("Phase 4: app.ml.train -- time-series split, MLflow logging")
