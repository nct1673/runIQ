"""Quality gate: reject videos the pipeline can't measure reliably."""
import numpy as np
import pandas as pd

MIN_FRAMES = 30        # after trimming; also keeps filtfilt's padding happy
MIN_NEAR_VISIBILITY = 0.5


class VideoQualityError(Exception):
    """Raised with a user-readable message; run_analysis stores it in `error`."""


def check_quality(df: pd.DataFrame, touchdowns: list[int] | None = None) -> None:
    """Raise VideoQualityError for: too few frames after trimming, feet
    disagreeing on direction, low near-side landmark visibility and (once
    `touchdowns` is given) fewer than 2 touchdowns (no complete stride).
    Call once before event detection and once after with the touchdowns."""
    from app.services.pose.events import body_near, facing_right  # avoid an import cycle

    if touchdowns is not None:
        if len(touchdowns) < 2:
            raise VideoQualityError(
                "Couldn't find two footstrikes -- the clip needs at least one complete stride."
            )
        return

    if len(df) < MIN_FRAMES:
        raise VideoQualityError("The video is too short to analyze.")
    if facing_right(df) == 0:
        raise VideoQualityError(
            "Couldn't tell which way you're running -- re-record from a clean side view."
        )
    near = body_near(df)
    vis = np.mean([df[f"{near}_{p}_vis"].median() for p in ("shoulder", "hip", "knee", "ankle")])
    if vis < MIN_NEAR_VISIBILITY:
        raise VideoQualityError("The runner's near side isn't clearly visible in this video.")
