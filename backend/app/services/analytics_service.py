"""Basic + performance analytics (blueprint SS10-11): totals, trends,
pace/HR/cadence over time -- the dashboard should answer "what is
happening to my running?", not just reproduce Strava.
"""


def get_summary(user_id) -> dict:
    raise NotImplementedError("Phase 3: totals, averages, longest/fastest run")


def get_trends(user_id) -> dict:
    raise NotImplementedError("Phase 3: pace/HR/cadence/distance trend series for charting")
