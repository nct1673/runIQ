"""Weather intelligence (blueprint SS14-16): fetch/cache OpenWeather data,
build the user's personal weather-performance profile, estimate
weather-adjusted pace. Does not attribute causation -- see blueprint SS16's
"the model estimates..." language requirement.
"""
from __future__ import annotations

import httpx

from app.core.config import get_settings

ONE_CALL_TIMELINE_URL = "https://api.openweathermap.org/data/4.0/onecall/timeline/1h?"


def fetch_weather_snapshot(lat: float, lon: float, timestamp: int) -> dict | None:
    """One activity's weather, matched to its start time -- the per-row
    unit called once per activity by app.ingestion.processor (never loops
    over a whole DataFrame itself; the caller owns the loop/throttling so
    it can pace batches of new activities, not repeated re-fetches).

    Same OpenWeather One Call 4.0 timeline call and closest-hour matching
    validated live in docs/ipynb/raw_process.ipynb cells 7-8, ported here
    with three fixes made on the way in:
      - `units=metric` is now passed, so temp/feels_like already come
        back in Celsius (the notebook's `- 273.17` cleanup step is no
        longer needed)
      - wind_speed is converted m/s -> km/h to match WeatherCondition's
        wind_speed_kmh
      - humidity and precipitation are kept in the returned dict, not
        dropped the way the notebook's `to_drop` list did

    Uses httpx (matching app.services.coach.llm_client's convention),
    not requests -- same HTTP semantics, no need for a second HTTP
    library in the backend.

    Returns None if OpenWeather has nothing for this lat/lon/time, or on
    any request failure (timeout/connection error/non-200) -- the caller
    treats that the same as "no weather for this activity" rather than
    aborting the whole sync over one bad lookup.
    """
    settings = get_settings()
    params = {
        "appid": settings.openweather_api_key,
        "lat": lat,
        "lon": lon,
        "dt": timestamp,
        "units": "metric",
    }

    try:
        response = httpx.get(ONE_CALL_TIMELINE_URL, params=params, timeout=10.0)
    except httpx.RequestError:
        return None

    if response.status_code != 200:
        return None

    hourly_list = response.json().get("data", [])
    if not hourly_list:
        return None

    matched = next((entry for entry in hourly_list if entry["dt"] == timestamp), None)
    if matched is None:
        matched = min(hourly_list, key=lambda entry: abs(entry["dt"] - timestamp))

    wind_speed_ms = matched.get("wind_speed")

    return {
        "temperature_c": matched.get("temp"),
        "feels_like_c": matched.get("feels_like"),
        "humidity_pct": matched.get("humidity"),
        "wind_speed_kmh": wind_speed_ms * 3.6 if wind_speed_ms is not None else None,
        "precipitation_mm": matched.get("rain", {}).get("1h"),
        "condition": matched.get("weather", [{}])[0].get("main"),
    }


def build_profile(user_id) -> dict:
    """The user's personal weather-performance profile -- blueprint SS15."""
    raise NotImplementedError("Phase 3: bucket temperature/humidity vs pace deltas, per blueprint SS15")


def adjusted_pace(activity_id) -> dict:
    raise NotImplementedError(
        "Phase 4: control for fitness/distance/load/elevation/HR/workout type first"
    )
