"""Chart data + annotated frames for the interface (the plots approved from
4_poseclean.ipynb):
  ankle_wave  - smoothed rel_ankle_left/right_new (opposite-phase wave)
  knee_angle  - knee_angle over time
  trunk_lean  - trunklean_angle over time
  elbow_angle - elbow_angle over time
  arm_swing   - armswing_angle over time
plus the annotated check frames (draw_check, notebook step 7), rendered to
JPEG files rather than chart series.
Skipped: raw/swap-fixed ankle plots and the exploratory all-column dumps.
"""
from pathlib import Path

import cv2
import pandas as pd

SINGLE_SERIES = {
    "knee_angle": "knee_angle",
    "trunk_lean": "trunklean_angle",
    "elbow_angle": "elbow_angle",
    "arm_swing": "armswing_angle",
}


def build_charts(df: pd.DataFrame) -> dict[str, list[dict]]:
    """Returns the `charts` dict of VideoAnalysisResult: per-frame points the
    frontend draws. Touchdown/midstance markers come from the result's
    touchdown_frames / midstance_frames."""
    frames = df["frame"].tolist()
    charts: dict[str, list[dict]] = {
        "ankle_wave": [
            {"frame": f, "left": round(l, 2), "right": round(r, 2)}
            for f, l, r in zip(frames, df["rel_ankle_left_new"], df["rel_ankle_right_new"])
        ]
    }
    for key, col in SINGLE_SERIES.items():
        charts[key] = [{"frame": f, "value": round(v, 2)} for f, v in zip(frames, df[col])]
    return charts


def _to_img(x: float, y: float, h: int) -> tuple[int, int]:
    """Our coordinates (y up) back to OpenCV pixels (y down)."""
    return int(round(x)), int(round(h - y))


def _draw_check(video_path: str, df: pd.DataFrame, frame_no: int, near: str, title: str,
                show_shank: bool):
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_no))
    ok, img = cap.read()
    cap.release()
    if not ok:
        raise ValueError(f"could not read frame {frame_no}")
    h = img.shape[0]
    r = df[df["frame"] == frame_no].iloc[0]

    def pt(name: str):
        return _to_img(r[f"{near}_{name}_x"], r[f"{near}_{name}_y"], h)

    sho, elb, wri = pt("shoulder"), pt("elbow"), pt("wrist")
    hip, knee, ank = pt("hip"), pt("knee"), pt("ankle")
    mhip = _to_img(r["mid_hip_x"], r["mid_hip_y"], h)
    msho = _to_img(r["mid_shoulder_x"], r["mid_shoulder_y"], h)

    # skeleton: arm and leg in green, trunk in blue, joints in red (BGR)
    for a, b in [(sho, elb), (elb, wri), (hip, knee), (knee, ank)]:
        cv2.line(img, a, b, (0, 255, 0), 2)
    cv2.line(img, mhip, msho, (255, 0, 0), 2)
    for p in [sho, elb, wri, hip, knee, ank]:
        cv2.circle(img, p, 4, (0, 0, 255), -1)

    # vertical reference line from the knee down to ankle height (yellow)
    if show_shank:
        cv2.line(img, knee, (knee[0], ank[1]), (0, 255, 255), 1)

    lines = [title,
             f"knee flexion {r['knee_flexion']:.1f}",
             f"shank angle  {r['shank_angle']:.1f}",
             f"trunk lean   {r['trunklean_angle']:.1f}",
             f"arm swing    {r['armswing_angle']:.1f}"]
    cv2.rectangle(img, (5, 5), (190, 10 + 18 * len(lines)), (255, 255, 255), -1)  # readable on dark video
    for i, t in enumerate(lines):
        cv2.putText(img, t, (10, 20 + 18 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
    return img


def render_check_frames(video_path: str, df: pd.DataFrame, touchdowns: list[int],
                        midstances: list[int], near: str, out_dir: str) -> list[dict]:
    """Draw skeleton/trunk/metrics on the event frames, save JPEGs under
    `out_dir`, return [{frame, kind, file}] (file = name inside out_dir)."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    events = [(f, "touchdown", True) for f in touchdowns] + [(f, "midstance", False) for f in midstances]

    frames = []
    for frame_no, kind, shank in events:
        img = _draw_check(video_path, df, frame_no, near, f"{kind} frame {frame_no}", shank)
        name = f"{kind}_{frame_no}.jpg"
        cv2.imwrite(str(out / name), img)
        frames.append({"frame": int(frame_no), "kind": kind, "file": name})
    return frames
