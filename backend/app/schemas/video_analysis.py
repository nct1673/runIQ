"""Pydantic response schema for the video-analysis API."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ArmSwing(BaseModel):
    min: float
    max: float
    range: float


class FormMetrics(BaseModel):
    """Per-event metrics are lists: one value per touchdown/midstance."""
    shank_angle_td: list[float] = []
    overstride_calf_td: list[float] = []   # calf lengths
    knee_flexion_td: list[float] = []
    knee_flexion_ms: list[float] = []
    trunk_lean: float | None = None        # stride average
    elbow_angle: float | None = None        # stride average
    arm_swing: ArmSwing | None = None


class CheckFrame(BaseModel):
    frame: int
    kind: str      # "touchdown" | "midstance"
    file: str      # served at GET /{video_id}/frames/{file}


class VideoAnalysisResult(BaseModel):
    facing: str                    # "right" | "left"
    near_side: str                 # "right" | "left"
    strides_analyzed: int
    fps: float = 0.0               # container fps; 0 = unknown (results from before this field existed)
    touchdown_frames: list[int]
    midstance_frames: list[int]
    metrics: FormMetrics
    # Per-frame series for the interface, filled by pose.plots.build_charts.
    # Approved keys: "ankle_wave" (smoothed rel. ankles, both sides), "knee_angle",
    # "trunk_lean", "elbow_angle", "arm_swing". Each is a list of {frame, ...} points;
    # touchdown/midstance markers come from touchdown_frames / midstance_frames.
    charts: dict[str, list[dict]] = {}
    # Annotated frames at each touchdown/midstance (notebook step 7).
    check_frames: list[CheckFrame] = []
    warnings: list[str] = Field(default_factory=list)


class VideoRename(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class VideoAnalysisOut(BaseModel):
    id: uuid.UUID
    original_filename: str
    content_type: str | None = None
    file_size_bytes: int | None = None
    status: str  # "pending" | "processing" | "completed" | "failed"
    result: VideoAnalysisResult | None = None
    error: str | None = None
    uploaded_at: datetime
    analyzed_at: datetime | None = None
