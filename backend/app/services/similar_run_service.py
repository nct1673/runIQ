"""Similar-run engine (blueprint SS13): for a given activity, find
historically similar runs by distance/workout type/elevation/
environmental conditions/training context, and compute the pace delta vs.
those runs.
"""


def find_similar(activity_id, k: int = 5) -> list[dict]:
    raise NotImplementedError("Phase 3: nearest-neighbor search over activity feature vector")
