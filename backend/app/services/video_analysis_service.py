"""Running-form video upload + storage, plus the hand-off to the pose
pipeline (app.services.pose). `run_analysis()` at the bottom is the
background-task glue and is intentionally left for you to write.
"""
from __future__ import annotations

import logging
import subprocess
from datetime import datetime
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models.video_analysis import VideoAnalysis
from app.schemas.video_analysis import VideoAnalysisResult
from app.services.pose.extract import extract_landmarks, video_fps
from app.services.pose.pipeline import run_pipeline
from app.services.pose.plots import build_charts, render_check_frames
from app.services.pose.quality import VideoQualityError

logger = logging.getLogger(__name__)

# backend/data/video_uploads -- bind-mounted via docker-compose's
# ./backend:/app, so uploads survive container restarts. Gitignored
# (never commit real user data, same policy as the repo-root /data).
VIDEO_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "video_uploads"
# Annotated check frames, one folder per video: <VIDEO_STORAGE_DIR>/frames/<video id>/
FRAMES_DIR = VIDEO_STORAGE_DIR / "frames"


VIDEO_MIME = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".avi": "video/x-msvideo"}


class VideoConversionError(ValueError):
    """The uploaded file couldn't be read or converted to a browser-playable format."""


# ffmpeg picks a demuxer from the file's extension and contents, so the
# client-supplied name and Content-Type can't be trusted: a playlist
# uploaded as "x.m3u8" would make ffprobe/ffmpeg follow file references
# inside it. Only these containers are accepted, and the first bytes must
# actually match the claimed container.
ALLOWED_SUFFIXES = frozenset(VIDEO_MIME)
_MP4_MOV_ATOMS = {b"ftyp", b"moov", b"mdat", b"wide", b"free", b"skip"}
# Network/other protocols are never needed for a plain local file.
FFMPEG_INPUT_GUARD = ["-protocol_whitelist", "file"]


def validated_suffix(filename: str | None) -> str:
    """Lowercased extension of the client's filename if it's an allowed
    video container, else VideoConversionError (surfaced as HTTP 422)."""
    suffix = Path(filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise VideoConversionError(
            f"Unsupported file type. Upload one of: {', '.join(sorted(ALLOWED_SUFFIXES))}."
        )
    return suffix


def looks_like_video(path: Path, suffix: str) -> bool:
    """True if the file's leading bytes match the container its extension
    claims (mp4/mov, webm, avi). Text such as an HLS playlist fails."""
    with path.open("rb") as f:
        head = f.read(12)
    if suffix in {".mp4", ".mov"}:
        return head[4:8] in _MP4_MOV_ATOMS
    if suffix == ".webm":
        return head[:4] == b"\x1a\x45\xdf\xa3"  # EBML header (WebM/Matroska)
    if suffix == ".avi":
        return head[:4] == b"RIFF" and head[8:12] == b"AVI "
    return False


def _ensure_web_playable(dest: Path) -> Path:
    """Browsers only play H.264 in MP4 and VP8/VP9/AV1 in WebM. Anything else
    (iPhone HEVC .mov, .avi, ...) is re-encoded to H.264 MP4 -- video only,
    original frame timing kept, so frame numbers stay the same. Returns the
    path of the playable file (dest itself if it was already fine). If ffmpeg
    isn't installed (plain local dev) the file is kept as is."""
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", *FFMPEG_INPUT_GUARD, "-select_streams", "v:0",
             "-show_entries", "stream=codec_name", "-of", "csv=p=0", str(dest)],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        logger.warning("ffmpeg not installed; skipping web-playback conversion")
        return dest
    codec = probe.stdout.strip()
    if probe.returncode != 0 or not codec:
        raise VideoConversionError("Couldn't read this video file.")

    suffix = dest.suffix.lower()
    if (suffix == ".mp4" and codec == "h264") or (suffix == ".webm" and codec in {"vp8", "vp9", "av1"}):
        return dest

    tmp = dest.with_name(f"{dest.stem}.tmp.mp4")
    result = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", *FFMPEG_INPUT_GUARD, "-i", str(dest),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
         "-an", "-movflags", "+faststart", "-fps_mode", "passthrough", str(tmp)],
        capture_output=True, text=True, timeout=600,
    )
    if result.returncode != 0:
        tmp.unlink(missing_ok=True)
        logger.error("ffmpeg conversion failed: %s", result.stderr[-500:])
        raise VideoConversionError("Couldn't convert this video to a web-playable format.")
    final = dest.with_suffix(".mp4")
    dest.unlink()
    tmp.replace(final)
    return final


def list_videos(db: Session, user_id: uuid.UUID) -> list[VideoAnalysis]:
    return list(
        db.scalars(
            select(VideoAnalysis)
            .where(VideoAnalysis.user_id == user_id)
            .order_by(VideoAnalysis.uploaded_at.desc())
        )
    )


def get_video(db: Session, user_id: uuid.UUID, video_id: uuid.UUID) -> VideoAnalysis | None:
    return db.scalar(
        select(VideoAnalysis).where(VideoAnalysis.id == video_id, VideoAnalysis.user_id == user_id)
    )


def save_upload(db: Session, user_id: uuid.UUID, file: UploadFile) -> VideoAnalysis:
    """Streams the uploaded video straight to disk (no full-file read into
    memory -- these can be large) and records it as status="pending".
    Pure storage/bookkeeping; does not analyze anything.
    """
    suffix = validated_suffix(file.filename)  # before anything is written
    VIDEO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    video = VideoAnalysis(
        user_id=user_id,
        original_filename=file.filename or "upload",
        storage_path="",  # filled in below once video.id exists
        content_type=file.content_type,
        status="pending",
    )
    db.add(video)
    db.flush()  # assigns video.id without committing yet

    dest = VIDEO_STORAGE_DIR / f"{video.id}{suffix}"
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    try:
        if not looks_like_video(dest, suffix):
            raise VideoConversionError("This file's contents don't match its video format.")
        dest = _ensure_web_playable(dest)
    except VideoConversionError:
        dest.unlink(missing_ok=True)
        db.rollback()  # drop the not-yet-committed row
        raise
    video.content_type = VIDEO_MIME.get(dest.suffix.lower(), video.content_type)
    video.storage_path = str(dest.relative_to(VIDEO_STORAGE_DIR.parent))
    video.file_size_bytes = dest.stat().st_size

    db.commit()
    db.refresh(video)
    return video


def rename_video(db: Session, video: VideoAnalysis, name: str) -> VideoAnalysis:
    """Display name only -- the file on disk is stored as <id><suffix>, so
    renaming never touches storage."""
    video.original_filename = name
    db.commit()
    db.refresh(video)
    return video


def delete_video(db: Session, video: VideoAnalysis) -> None:
    (VIDEO_STORAGE_DIR.parent / video.storage_path).unlink(missing_ok=True)
    shutil.rmtree(FRAMES_DIR / str(video.id), ignore_errors=True)
    db.delete(video)
    db.commit()


def start_analysis(db: Session, video: VideoAnalysis) -> VideoAnalysis:
    """Marks the video "processing" so the route can return immediately; the
    actual work runs in run_analysis via a background task."""
    video.status = "processing"
    video.error = None
    db.commit()
    db.refresh(video)
    return video


def run_analysis(video_id: uuid.UUID) -> None:
    """Background-task entry point. Opens its OWN session (the request's
    session is closed by the time this runs). A video the pipeline can't
    measure (VideoQualityError) is recorded as status="failed" with its
    user-readable message; anything unexpected propagates to
    run_analysis_task, which stores a generic message instead.
    """
    with SessionLocal() as db:
        video = db.get(VideoAnalysis, video_id)
        if video is None:
            return
        try:
            path = str(VIDEO_STORAGE_DIR.parent / video.storage_path)
            raw, width, height = extract_landmarks(path)
            out = run_pipeline(raw, width, height)

            frames_dir = FRAMES_DIR / str(video.id)
            shutil.rmtree(frames_dir, ignore_errors=True)  # re-analysis: drop stale frames
            check_frames = render_check_frames(path, out.df, out.touchdowns, out.midstances, out.near, str(frames_dir))

            result = VideoAnalysisResult(
                facing="right" if out.direction == 1 else "left",
                near_side=out.near,
                strides_analyzed=len(out.touchdowns) - 1,
                fps=video_fps(path),
                touchdown_frames=[int(f) for f in out.touchdowns],
                midstance_frames=[int(f) for f in out.midstances],
                metrics=out.metrics,
                charts=build_charts(out.df),
                check_frames=check_frames,
                warnings=out.warnings,
            )
            video.result = result.model_dump_json()
            video.status = "completed"
            video.error = None
            video.analyzed_at = datetime.utcnow()
        except VideoQualityError as e:
            video.status = "failed"
            video.error = str(e)
        db.commit()


def run_analysis_task(video_id: uuid.UUID) -> None:
    """What the route actually schedules: calls run_analysis and guarantees the
    row never stays stuck on "processing" if it raises (including the
    NotImplementedError from the unfinished pipeline)."""
    try:
        run_analysis(video_id)
    except Exception:
        logger.exception("Video analysis failed for %s", video_id)
        with SessionLocal() as db:
            video = db.get(VideoAnalysis, video_id)
            if video is not None and video.status == "processing":
                video.status = "failed"
                video.error = "Analysis failed unexpectedly -- please try again or re-record the video."
                db.commit()
