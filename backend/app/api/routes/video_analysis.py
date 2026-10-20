"""Running-form video endpoints -- upload, list, fetch, delete, and
trigger analysis. Analysis runs as a background task; clients poll GET
until status is "completed" or "failed".
"""
import re
import uuid

from fastapi.responses import FileResponse
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.video_analysis import VideoAnalysis
from app.schemas.video_analysis import VideoAnalysisOut, VideoAnalysisResult, VideoRename
from app.services import video_analysis_service
from app.services.user_service import get_or_create_default_user

router = APIRouter()

# Side-view running videos are the expected input -- common phone/camera
# export formats only, not an open-ended "any file" upload.
ALLOWED_CONTENT_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"}


def _to_out(video: VideoAnalysis) -> VideoAnalysisOut:
    return VideoAnalysisOut(
        id=video.id,
        original_filename=video.original_filename,
        content_type=video.content_type,
        file_size_bytes=video.file_size_bytes,
        status=video.status,
        result=VideoAnalysisResult.model_validate_json(video.result) if video.result else None,
        error=video.error,
        uploaded_at=video.uploaded_at,
        analyzed_at=video.analyzed_at,
    )


def _get_owned_video(db: Session, user_id: uuid.UUID, video_id: uuid.UUID) -> VideoAnalysis:
    video = video_analysis_service.get_video(db, user_id, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.get("", response_model=list[VideoAnalysisOut])
def list_videos(db: Session = Depends(get_db)) -> list[VideoAnalysisOut]:
    user = get_or_create_default_user(db)
    return [_to_out(v) for v in video_analysis_service.list_videos(db, user.id)]


@router.post("", response_model=VideoAnalysisOut, status_code=201)
def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)) -> VideoAnalysisOut:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported video type: {file.content_type}")

    user = get_or_create_default_user(db)
    try:
        video = video_analysis_service.save_upload(db, user.id, file)
    except video_analysis_service.VideoConversionError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return _to_out(video)


@router.get("/{video_id}", response_model=VideoAnalysisOut)
def get_video(video_id: uuid.UUID, db: Session = Depends(get_db)) -> VideoAnalysisOut:
    user = get_or_create_default_user(db)
    return _to_out(_get_owned_video(db, user.id, video_id))


@router.patch("/{video_id}", response_model=VideoAnalysisOut)
def rename_video(video_id: uuid.UUID, body: VideoRename, db: Session = Depends(get_db)) -> VideoAnalysisOut:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name can't be empty")
    user = get_or_create_default_user(db)
    video = _get_owned_video(db, user.id, video_id)
    return _to_out(video_analysis_service.rename_video(db, video, name))


@router.delete("/{video_id}", status_code=204)
def delete_video(video_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    user = get_or_create_default_user(db)
    video = _get_owned_video(db, user.id, video_id)
    video_analysis_service.delete_video(db, video)


@router.post("/{video_id}/analyze", response_model=VideoAnalysisOut, status_code=202)
def analyze_video(
    video_id: uuid.UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
) -> VideoAnalysisOut:
    """Queues form analysis and returns right away with status="processing"."""
    user = get_or_create_default_user(db)
    video = _get_owned_video(db, user.id, video_id)
    if video.status == "processing":
        raise HTTPException(status_code=409, detail="Analysis already running")
    video_analysis_service.start_analysis(db, video)
    background_tasks.add_task(video_analysis_service.run_analysis_task, video.id)
    return _to_out(video)


_FRAME_FILE = re.compile(r"^(touchdown|midstance)_\d+\.jpg$")


@router.get("/{video_id}/frames/{file}")
def get_check_frame(video_id: uuid.UUID, file: str, db: Session = Depends(get_db)) -> FileResponse:
    """Serves one annotated check frame. The filename is validated against a
    strict pattern and the folder comes from the owned video's id, so no
    user-supplied path ever reaches the filesystem."""
    user = get_or_create_default_user(db)
    video = _get_owned_video(db, user.id, video_id)
    path = video_analysis_service.FRAMES_DIR / str(video.id) / file
    if not _FRAME_FILE.match(file) or not path.is_file():
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(path, media_type="image/jpeg")


@router.get("/{video_id}/video")
def get_video_file(video_id: uuid.UUID, db: Session = Depends(get_db)) -> FileResponse:
    """Streams the stored video for the in-page player. FileResponse handles
    HTTP Range requests, so seeking works without downloading the whole file."""
    user = get_or_create_default_user(db)
    video = _get_owned_video(db, user.id, video_id)
    path = video_analysis_service.VIDEO_STORAGE_DIR.parent / video.storage_path
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found")
    media_type = video_analysis_service.VIDEO_MIME.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type)
