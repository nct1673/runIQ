"""Training load + fitness/fatigue (blueprint SS18-19): 7d/28d load,
training frequency, weekly/long-run volume, intensity distribution, and a
model-derived fitness-vs-fatigue split -- presented as indicators, not
medical measurements.
"""


def compute_training_load(user_id, as_of_date) -> dict:
    raise NotImplementedError("Phase 3: rolling 7d/28d load from duration/distance/intensity/HR")


def fitness_vs_fatigue(user_id, as_of_date) -> dict:
    raise NotImplementedError("Phase 3: separate short-term fatigue from longer-term fitness trend")
