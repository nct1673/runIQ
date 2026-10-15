"""The whole notebook as one pure function: raw landmarks in, metrics out."""
from dataclasses import dataclass, field

import pandas as pd

from app.services.pose import clean, events, metrics
from app.services.pose.extract import LANDMARKS
from app.services.pose.quality import check_quality


@dataclass
class PipelineOutput:
    df: pd.DataFrame              # smoothed, pixel-space, with every metric column
    near: str
    direction: int
    stride_frames: int
    touchdowns: list[int]
    midstances: list[int]
    metrics: dict
    warnings: list[str] = field(default_factory=list)


def run_pipeline(raw: pd.DataFrame, width: int, height: int) -> PipelineOutput:
    """raw = extract_landmarks() output. Raises VideoQualityError for videos
    that can't be measured reliably."""
    cols = ["frame", "time_s"] + [f"{name}_{s}" for name in LANDMARKS.values() for s in ("x", "y", "vis")]
    df = clean.trim_edges(raw[cols])
    df = clean.to_pixels(df, width, height)
    check_quality(df)

    df = clean.fix_lr_swaps(df, clean.calf_len(df))
    stride_frames = clean.stride_period(df)
    df_s = clean.smooth(df, stride_frames)

    near = events.body_near(df_s)
    direction = events.facing_right(df_s)
    touchdowns = events.detect_touchdowns(df_s)
    midstances = events.detect_midstance(df_s)
    check_quality(df_s, touchdowns)

    calflen = clean.calf_len(df_s)
    df_s = metrics.add_knee(df_s, near)
    df_s = metrics.add_overstride(df_s, near, direction, calflen)
    df_s = metrics.add_shank_angle(df_s, near, direction)
    df_s = metrics.add_trunk_lean(df_s, direction)
    df_s = metrics.add_elbow_angle(df_s, near)
    df_s = metrics.add_arm_swing(df_s, near, direction)

    warnings = []
    strides = len(touchdowns) - 1
    if strides < 2:
        warnings.append("Based on a single complete stride; more strides give steadier numbers.")
    if events.peaks_error(touchdowns, stride_frames):
        warnings.append("Some footstrikes were detected unusually close together; results may be off.")

    return PipelineOutput(
        df=df_s, near=near, direction=direction, stride_frames=stride_frames,
        touchdowns=touchdowns, midstances=midstances,
        metrics=metrics.summarize(df_s, touchdowns, midstances), warnings=warnings,
    )
