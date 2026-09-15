"""Model training entrypoint (blueprint SS23-24): compares classical
models (ElasticNet, Random Forest, XGBoost/LightGBM) against the
baselines in baselines.py, using time-series (not random) train/
validation/test splits, and logs everything to MLflow.
"""


def train_and_compare(user_id) -> dict:
    raise NotImplementedError("Phase 4: expanding-window or rolling-window time-series CV")
