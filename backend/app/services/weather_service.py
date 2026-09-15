"""Weather intelligence (blueprint SS14-16): fetch/cache OpenWeather data,
build the user's personal weather-performance profile, estimate
weather-adjusted pace. Does not attribute causation -- see blueprint SS16's
"the model estimates..." language requirement.
"""


def fetch_weather_snapshot(lat: float, lon: float, timestamp) -> dict:
    raise NotImplementedError("Phase 2: call OpenWeather One Call API 4.0, cache the response")


def build_profile(user_id) -> dict:
    raise NotImplementedError("Phase 3: bucket temperature/humidity vs pace deltas, per blueprint SS15")


def adjusted_pace(activity_id) -> dict:
    raise NotImplementedError(
        "Phase 4: control for fitness/distance/load/elevation/HR/workout type first"
    )
