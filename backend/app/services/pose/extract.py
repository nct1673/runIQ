"""Step 0 (pose.py in the draft): video -> raw MediaPipe landmarks."""
import cv2
import pandas as pd

from app.services.pose.quality import VideoQualityError

# The 16 landmarks the pipeline uses (MediaPipe index, name). Left/right pairs.
LANDMARKS = {
    11: "left_shoulder", 12: "right_shoulder",
    13: "left_elbow", 14: "right_elbow",
    15: "left_wrist", 16: "right_wrist",
    23: "left_hip", 24: "right_hip",
    25: "left_knee", 26: "right_knee",
    27: "left_ankle", 28: "right_ankle",
    29: "left_heel", 30: "right_heel",
    31: "left_foot_index", 32: "right_foot_index",
}

MIN_DETECTED_FRAMES = 30


def video_fps(video_path: str) -> float:
    """The container's frame rate. Playback time = frame / fps, which is what
    the frontend uses to sync the video with the charts (the pipeline itself
    never uses fps, since slow-motion files report the wrong value)."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    cap.release()
    return float(fps)


def extract_landmarks(video_path: str, complexity: int = 2) -> tuple[pd.DataFrame, int, int]:
    """Run MediaPipe Pose over every frame.

    Returns (df, width, height). df has one row per frame *where a pose was
    found* (same as the draft), with columns `frame` (the real video frame
    index), `time_s`, and `{name}_x/_y/_vis` for each LANDMARKS entry
    (x, y still normalized 0-1; z is dropped as unreliable in a side view).
    """
    import mediapipe as mp  # lazy: keeps the rest of the package importable without it

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoQualityError("Couldn't open the video file.")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    rows = []
    frame_idx = 0
    with mp.solutions.pose.Pose(
        static_image_mode=False,       # video mode: detect once, then track
        model_complexity=complexity,   # 2 = heavy (most accurate, slowest)
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if results.pose_landmarks:
                lms = results.pose_landmarks.landmark
                row = {"frame": frame_idx, "time_s": round(frame_idx / fps, 4)}
                for idx, name in LANDMARKS.items():
                    row[f"{name}_x"] = lms[idx].x
                    row[f"{name}_y"] = lms[idx].y
                    row[f"{name}_vis"] = lms[idx].visibility
                rows.append(row)
            frame_idx += 1
    cap.release()

    if len(rows) < MIN_DETECTED_FRAMES:
        raise VideoQualityError("Couldn't detect a runner in enough frames of the video.")
    return pd.DataFrame(rows), width, height
