"""Steps 1-3 of the notebook: trim, pixel conversion, swap fix, smoothing.

Each function returns a NEW DataFrame -- no "run this cell only once" hazards.
"""
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks

from app.services.pose.events import body_near
from app.services.pose.quality import VideoQualityError

PARTS = ["shoulder", "elbow", "wrist", "hip", "knee", "ankle", "heel", "foot_index"]
LEG_PARTS = ["hip", "knee", "ankle", "heel", "foot_index"]


def landmark_cols(suffix: str) -> list[str]:
    return [f"{side}_{p}_{suffix}" for side in ("left", "right") for p in PARTS]


def add_derived(df: pd.DataFrame) -> pd.DataFrame:
    """mid-hip, mid-shoulder and the hip-relative ankle x (+ = ankle in front
    of the hip for a left-to-right runner). Must be recomputed whenever the
    underlying landmark columns change (pixel conversion, swap fix, smoothing)."""
    df = df.copy()
    df["mid_hip_x"] = (df["left_hip_x"] + df["right_hip_x"]) / 2
    df["mid_hip_y"] = (df["left_hip_y"] + df["right_hip_y"]) / 2
    df["mid_shoulder_x"] = (df["left_shoulder_x"] + df["right_shoulder_x"]) / 2
    df["mid_shoulder_y"] = (df["left_shoulder_y"] + df["right_shoulder_y"]) / 2
    df["rel_ankle_left_new"] = df["left_ankle_x"] - df["mid_hip_x"]
    df["rel_ankle_right_new"] = df["right_ankle_x"] - df["mid_hip_x"]
    return df


def trim_edges(df: pd.DataFrame, frac: float = 0.1) -> pd.DataFrame:
    """1a. Drop the first/last `frac` of frames (runner entering/leaving)."""
    n = len(df)
    return df.iloc[int(frac * n): int((1 - frac) * n)].reset_index(drop=True)


def to_pixels(df: pd.DataFrame, width: int, height: int) -> pd.DataFrame:
    """2. x*width, (1-y)*height (y up), then the derived columns (mid-hip,
    mid-shoulder, relative ankle) computed in pixels."""
    df = df.copy()
    for c in landmark_cols("x"):
        df[c] = df[c] * width
    for c in landmark_cols("y"):
        df[c] = (1 - df[c]) * height
    return add_derived(df)


def calf_len(df: pd.DataFrame, side: str = "right") -> float:
    """Median knee->ankle distance in px (the body-based ruler), over the
    middle 80% of frames. The median ignores frames with detection errors."""
    n = len(df)
    core = df.iloc[int(0.1 * n): int(0.9 * n)]
    dx = core[f"{side}_ankle_x"] - core[f"{side}_knee_x"]
    dy = core[f"{side}_ankle_y"] - core[f"{side}_knee_y"]
    return float(np.hypot(dx, dy).median().round(2))


def fix_lr_swaps(df: pd.DataFrame, calflen: float) -> pd.DataFrame:
    """3a/3b. Detect frames where both ankles deviate from a centered rolling
    median (window 5) by > 0.5*calflen in opposite directions, then swap all
    left/right leg columns in those frames."""
    window = 5
    rel_l = df["left_ankle_x"] - df["mid_hip_x"]
    rel_r = df["right_ankle_x"] - df["mid_hip_x"]
    dev_l = rel_l - rel_l.rolling(window, center=True, min_periods=1).median()
    dev_r = rel_r - rel_r.rolling(window, center=True, min_periods=1).median()

    threshold = 0.5 * calflen
    mask = (dev_l.abs() > threshold) & (dev_r.abs() > threshold) & (np.sign(dev_l) != np.sign(dev_r))

    df = df.copy()
    left_cols = [f"left_{p}_{c}" for p in LEG_PARTS for c in ("x", "y", "vis")]
    right_cols = [f"right_{p}_{c}" for p in LEG_PARTS for c in ("x", "y", "vis")]
    left_vals = df.loc[mask, left_cols].to_numpy()    # copy both sides first
    right_vals = df.loc[mask, right_cols].to_numpy()
    df.loc[mask, left_cols] = right_vals
    df.loc[mask, right_cols] = left_vals
    return add_derived(df)


def stride_period(df: pd.DataFrame) -> int:
    """3d. Median peak-to-peak (and trough-to-trough) gap, in frames, of the
    near ankle's relative x, using `find_peaks` with a prominence of 30% of
    the signal range. The runner's stride is the clock instead of fps, which
    can't be trusted for slow-motion video."""
    near = body_near(df)
    sig = df[f"rel_ankle_{near}_new"].to_numpy()
    prom = 0.3 * (sig.max() - sig.min())

    peaks, _ = find_peaks(sig, prominence=prom)      # foot furthest in front
    troughs, _ = find_peaks(-sig, prominence=prom)   # foot furthest behind

    gaps = np.concatenate([np.diff(peaks), np.diff(troughs)])
    if len(gaps) == 0:
        raise VideoQualityError("Couldn't find repeating strides -- the clip needs at least two steps.")
    return int(round(float(np.median(gaps))))


def smooth(df: pd.DataFrame, stride_frames: int, k: int = 6) -> pd.DataFrame:
    """3e. 4th-order Butterworth low-pass via filtfilt (zero lag); cutoff = k x
    stride frequency, as a fraction of Nyquist (0.5 cycles/frame). Mid-hip and
    relative-ankle columns are recomputed afterwards."""
    wn = (k / stride_frames) / 0.5
    if not 0 < wn < 1:
        raise VideoQualityError("The detected stride is too short to analyze reliably.")
    b, a = butter(4, wn, btype="low")

    df = df.copy()
    for c in landmark_cols("x") + landmark_cols("y"):
        df[c] = filtfilt(b, a, df[c].to_numpy())
    return add_derived(df)
