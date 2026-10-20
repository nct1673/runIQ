"""Regression test: the ported pipeline must reproduce the numbers from the
4_poseclean.ipynb draft on run1 (640x360). Uses the saved landmarks CSV, so
MediaPipe isn't needed.
"""
from pathlib import Path

import pandas as pd
import pytest

from app.services.pose.metrics import joint_angle
from app.services.pose.pipeline import run_pipeline
from app.services.pose.quality import VideoQualityError

FIXTURE = Path(__file__).parent / "fixtures" / "run1_landmarks.csv"


def test_joint_angle() -> None:
    assert joint_angle([0, 1], [0, 0], [1, 0]) == 90
    assert joint_angle([0, 1], [0, 0], [0, -1]) == 180


def test_run1_matches_notebook() -> None:
    out = run_pipeline(pd.read_csv(FIXTURE), 640, 360)
    assert (out.near, out.direction, out.stride_frames) == ("right", 1, 83)
    assert out.touchdowns == [62, 144]
    assert out.midstances == [80, 161]
    m = out.metrics
    assert m["shank_angle_td"] == pytest.approx([12.7, 11.4], abs=0.1)
    assert m["overstride_calf_td"] == pytest.approx([0.81, 0.84], abs=0.01)
    assert m["knee_flexion_td"] == pytest.approx([25.6, 23.3], abs=0.1)
    assert m["knee_flexion_ms"] == pytest.approx([44.7, 37.8], abs=0.1)
    assert m["trunk_lean"] == pytest.approx(3.4, abs=0.1)
    assert m["elbow_angle"] == pytest.approx(116.3, abs=0.1)
    assert m["arm_swing"]["min"] == pytest.approx(-62.2, abs=0.1)
    assert m["arm_swing"]["max"] == pytest.approx(-12.3, abs=0.1)


def test_too_short_video_rejected() -> None:
    with pytest.raises(VideoQualityError):
        run_pipeline(pd.read_csv(FIXTURE).iloc[:40], 640, 360)
