"""Race-goal tracking (blueprint SS26-28): target time vs. current
prediction, progress gap over time, and a training-plan recommendation
that explains itself rather than outputting a generic plan.
"""


def create_goal(user_id, distance_label: str, target_time_s: float, race_date) -> dict:
    raise NotImplementedError("Phase 5")


def progress(goal_id) -> dict:
    raise NotImplementedError("Phase 5: current prediction vs target, trend over recent weeks")


def recommend_training_focus(goal_id) -> dict:
    raise NotImplementedError(
        "Phase 5: aerobic volume / long-run / threshold / speed / recovery gaps"
    )
