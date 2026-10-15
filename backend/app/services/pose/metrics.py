"""Step 6 of the notebook: form metrics. All angles in degrees, y up."""
import math

import numpy as np
import pandas as pd


def joint_angle(a: list[float], b: list[float], c: list[float]) -> float:
    """Angle at b between b->a and b->c; cosine clipped to [-1, 1] to avoid
    NaN from rounding. Straight joint = 180."""
    u = [a[0] - b[0], a[1] - b[1]]
    v = [c[0] - b[0], c[1] - b[1]]
    u_norm = math.sqrt(u[0] ** 2 + u[1] ** 2)
    v_norm = math.sqrt(v[0] ** 2 + v[1] ** 2)
    if u_norm == 0 or v_norm == 0:
        return float("nan")
    cos_theta = (u[0] * v[0] + u[1] * v[1]) / (u_norm * v_norm)
    return round(float(np.degrees(np.arccos(np.clip(cos_theta, -1, 1)))), 2)


def _segment_angle(dx: pd.Series, dy: pd.Series) -> pd.Series:
    """Angle from vertical: 0 = vertical, + = tilted forward."""
    return np.degrees(np.arctan2(dx, dy)).round(2)


def add_knee(df: pd.DataFrame, near: str) -> pd.DataFrame:
    """6a. knee_angle (hip-knee-ankle) and knee_flexion = 180 - knee_angle."""
    df = df.copy()
    df["knee_angle"] = df.apply(
        lambda r: joint_angle(
            [r[f"{near}_hip_x"], r[f"{near}_hip_y"]],
            [r[f"{near}_knee_x"], r[f"{near}_knee_y"]],
            [r[f"{near}_ankle_x"], r[f"{near}_ankle_y"]],
        ),
        axis=1,
    )
    df["knee_flexion"] = (180 - df["knee_angle"]).round(2)
    return df


def add_overstride(df: pd.DataFrame, near: str, direction: int, calflen: float) -> pd.DataFrame:
    """6b. overstride_dist = direction * (near ankle x - mid_hip_x) / calflen."""
    df = df.copy()
    df["overstride_dist"] = ((direction * (df[f"{near}_ankle_x"] - df["mid_hip_x"])) / calflen).round(2)
    return df


def add_shank_angle(df: pd.DataFrame, near: str, direction: int) -> pd.DataFrame:
    """6c. shank_angle = atan2(direction*(ankle_x-knee_x), knee_y-ankle_y)."""
    df = df.copy()
    dx = (df[f"{near}_ankle_x"] - df[f"{near}_knee_x"]) * direction
    dy = df[f"{near}_knee_y"] - df[f"{near}_ankle_y"]
    df["shank_angle"] = _segment_angle(dx, dy)
    return df


def add_trunk_lean(df: pd.DataFrame, direction: int) -> pd.DataFrame:
    """6d. trunklean_angle from mid-hip -> mid-shoulder vs vertical. Needs
    mid_hip_y / mid_shoulder_* in PIXELS (see to_pixels)."""
    df = df.copy()
    dx = (df["mid_shoulder_x"] - df["mid_hip_x"]) * direction
    dy = df["mid_shoulder_y"] - df["mid_hip_y"]
    df["trunklean_angle"] = _segment_angle(dx, dy)
    return df


def add_elbow_angle(df: pd.DataFrame, near: str) -> pd.DataFrame:
    """6e. elbow_angle = joint_angle(shoulder, elbow, wrist), near arm."""
    df = df.copy()
    df["elbow_angle"] = df.apply(
        lambda r: joint_angle(
            [r[f"{near}_shoulder_x"], r[f"{near}_shoulder_y"]],
            [r[f"{near}_elbow_x"], r[f"{near}_elbow_y"]],
            [r[f"{near}_wrist_x"], r[f"{near}_wrist_y"]],
        ),
        axis=1,
    )
    return df


def add_arm_swing(df: pd.DataFrame, near: str, direction: int) -> pd.DataFrame:
    """6f. armswing_angle of the upper arm from straight down; + = elbow
    forward, - = elbow behind."""
    df = df.copy()
    dx = (df[f"{near}_elbow_x"] - df[f"{near}_shoulder_x"]) * direction
    dy = df[f"{near}_shoulder_y"] - df[f"{near}_elbow_y"]
    df["armswing_angle"] = _segment_angle(dx, dy)
    return df


def summarize(df: pd.DataFrame, touchdowns: list[int], midstances: list[int]) -> dict:
    """Values at touchdown/midstance frames + averages over the complete
    stride (first touchdown <= frame < last touchdown; partial strides would
    over-represent some phases). Returns the `metrics` dict of FormMetrics."""
    td = df[df["frame"].isin(touchdowns)]
    ms = df[df["frame"].isin(midstances)]
    metrics: dict = {
        "shank_angle_td": td["shank_angle"].tolist(),
        "overstride_calf_td": td["overstride_dist"].tolist(),
        "knee_flexion_td": td["knee_flexion"].tolist(),
        "knee_flexion_ms": ms["knee_flexion"].tolist(),
    }
    if len(touchdowns) >= 2:
        full = df[(df["frame"] >= touchdowns[0]) & (df["frame"] < touchdowns[-1])]
        arm = full["armswing_angle"]
        metrics["trunk_lean"] = round(float(full["trunklean_angle"].mean()), 2)
        metrics["elbow_angle"] = round(float(full["elbow_angle"].mean()), 2)
        metrics["arm_swing"] = {
            "min": float(arm.min()),
            "max": float(arm.max()),
            "range": round(float(arm.max() - arm.min()), 2),
        }
    return metrics
