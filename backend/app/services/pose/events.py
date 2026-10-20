"""Steps 4-5 of the notebook: direction, near side, touchdown, midstance."""
import numpy as np
import pandas as pd
from scipy.signal import argrelextrema


def facing_right(df: pd.DataFrame) -> int:
    """1 = facing right, -1 = facing left, 0 = feet disagree (unreliable).
    Toes point forward: compare foot-index x with heel x for both feet."""
    left = (df["left_foot_index_x"] - df["left_heel_x"]).median()
    right = (df["right_foot_index_x"] - df["right_heel_x"]).median()
    if left > 0 and right > 0:
        return 1
    if left < 0 and right < 0:
        return -1
    return 0


def body_near(df: pd.DataFrame) -> str:
    """'right' | 'left' | 'NA' -- the side facing the camera (a runner facing
    right shows the camera their right side)."""
    direction = facing_right(df)
    if direction == 1:
        return "right"
    if direction == -1:
        return "left"
    return "NA"


def detect_touchdowns(df: pd.DataFrame) -> list[int]:
    """Local maxima of the near ankle's relative x (foot furthest in front of
    the hip). Returns frame numbers."""
    sig = df[f"rel_ankle_{body_near(df)}_new"].to_numpy()
    peaks = argrelextrema(sig, np.greater)[0]
    return df["frame"].iloc[peaks].tolist()


def detect_midstance(df: pd.DataFrame) -> list[int]:
    """Frames where the near ankle's relative x crosses zero going + to -
    (foot passing under the hip). The - to + crossing happens in swing, so
    it is excluded. Returns frame numbers."""
    sig = df[f"rel_ankle_{body_near(df)}_new"].to_numpy()
    sign = np.sign(sig)
    idx = np.where((sign[:-1] > 0) & (sign[1:] <= 0))[0]
    return df["frame"].iloc[idx].tolist()


def peaks_error(touchdowns: list[int], stride_frames: int) -> list[int]:
    """Indices of touchdowns followed by another closer than half a stride
    (empty list = no errors)."""
    return [
        i for i in range(len(touchdowns) - 1)
        if touchdowns[i + 1] - touchdowns[i] < 0.5 * stride_frames
    ]
