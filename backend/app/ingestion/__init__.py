"""Activity data ingestion.

`garmin_api_loader.py` is the bronze-layer source: pulls raw activity
data straight from the Garmin Connect API into `activities_raw`, no
parsing/filtering. `normalizer.py`/`validators.py`/`loader.py` are the
raw-to-processed pipeline (targets `activities`) -- user-owned, in
progress (see docs/ipynb/raw_process.ipynb).
"""
