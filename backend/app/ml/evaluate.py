"""Model evaluation (blueprint SS56/SS57): MAE, RMSE, R^2 where
appropriate, prediction-interval coverage, and comparison against the
naive baselines -- plus SHAP-based explainability (blueprint SS25).
"""


def evaluate(model, X_test, y_test) -> dict:
    raise NotImplementedError("Phase 4")
