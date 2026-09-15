"""Air-quality intelligence (blueprint SS17): fetch/cache Google Air
Quality API data, relate AQI/PM2.5 to pace/HR as an observed/modelled
relationship -- never as medical causation.
"""


def fetch_air_quality_snapshot(lat: float, lon: float, timestamp) -> dict:
    raise NotImplementedError("Phase 2: call Google Maps Air Quality API, cache the response")


def analyze(user_id) -> dict:
    raise NotImplementedError("Phase 3: relate AQI/PM2.5/pollutants to pace and HR")
