"""Activity endpoints.

`POST /sync-garmin` runs the full pipeline in one request: pulls
activities from the Garmin Connect API into the bronze layer
(`activities_raw`) via `app.ingestion.garmin_api_loader`, then
immediately runs the raw-to-processed pipeline
(`app.ingestion.processor`) so `activities`/`weather_conditions` are
populated in the same "Update Data" press -- no separate manual step.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.ingestion import garmin_api_loader, processor
from app.models.activity import Activity
from app.models.weather import WeatherCondition
from app.schemas.activity import ActivityDetailOut, ActivityOut, GarminSyncResult
from app.services.user_service import get_or_create_default_user

router = APIRouter()


@router.get("", response_model=list[ActivityOut])
def list_activities(db: Session = Depends(get_db)) -> list[ActivityOut]:
    """List imported (processed) activities, most recent first, each with
    its weather snapshot flattened on (None for treadmill runs -- no GPS
    to look weather up against). Empty until something populates
    `activities` from `activities_raw`.

    Path is "" (== /api/activities, no trailing slash), matching what
    the frontend's rewrite proxy actually forwards -- see main.py's
    redirect_slashes=False comment for why a "/" here would be a bug,
    not just a style choice.
    """
    user = get_or_create_default_user(db)
    rows = db.execute(
        select(Activity, WeatherCondition)
        .outerjoin(WeatherCondition, WeatherCondition.activity_id == Activity.id)
        .where(Activity.user_id == user.id)
        .order_by(Activity.started_at.desc())
    ).all()

    return [
        ActivityOut(
            id=activity.id,
            started_at=activity.started_at,
            distance_km=activity.distance_km,
            duration_s=activity.duration_s,
            avg_pace_s_per_km=activity.avg_pace_s_per_km,
            avg_hr=activity.avg_hr,
            avg_cadence=activity.avg_cadence,
            elevation_gain_m=activity.elevation_gain_m,
            activity_type=activity.activity_type,
            temperature_c=weather.temperature_c if weather else None,
            weather_condition=weather.condition if weather else None,
        )
        for activity, weather in rows
    ]


@router.get("/{activity_id}", response_model=ActivityDetailOut)
def get_activity(activity_id: uuid.UUID, db: Session = Depends(get_db)) -> ActivityDetailOut:
    """One activity's full DB record -- every `activities` column plus
    its linked `weather_conditions` row -- for the /activities detail
    dropdown."""
    user = get_or_create_default_user(db)
    row = db.execute(
        select(Activity, WeatherCondition)
        .outerjoin(WeatherCondition, WeatherCondition.activity_id == Activity.id)
        .where(Activity.id == activity_id, Activity.user_id == user.id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity, weather = row
    return ActivityDetailOut(
        id=activity.id,
        source=activity.source,
        external_id=activity.external_id,
        started_at=activity.started_at,
        distance_km=activity.distance_km,
        duration_s=activity.duration_s,
        avg_pace_s_per_km=activity.avg_pace_s_per_km,
        avg_hr=activity.avg_hr,
        avg_cadence=activity.avg_cadence,
        elevation_gain_m=activity.elevation_gain_m,
        activity_type=activity.activity_type,
        created_at=activity.created_at,
        raw_imported_at=activity.raw_imported_at,
        activity_name=activity.activity_name,
        event_type=activity.event_type,
        elapsed_duration_s=activity.elapsed_duration_s,
        moving_duration_s=activity.moving_duration_s,
        calories=activity.calories,
        avg_power=activity.avg_power,
        norm_power=activity.norm_power,
        avg_stride_length=activity.avg_stride_length,
        avg_vertical_oscillation=activity.avg_vertical_oscillation,
        avg_vertical_ratio=activity.avg_vertical_ratio,
        avg_ground_contact_time=activity.avg_ground_contact_time,
        start_latitude=activity.start_latitude,
        start_longitude=activity.start_longitude,
        training_effect_label=activity.training_effect_label,
        vo2_max=activity.vo2_max,
        hr_time_in_zone_1=activity.hr_time_in_zone_1,
        hr_time_in_zone_2=activity.hr_time_in_zone_2,
        hr_time_in_zone_3=activity.hr_time_in_zone_3,
        hr_time_in_zone_4=activity.hr_time_in_zone_4,
        hr_time_in_zone_5=activity.hr_time_in_zone_5,
        power_time_in_zone_1=activity.power_time_in_zone_1,
        power_time_in_zone_2=activity.power_time_in_zone_2,
        power_time_in_zone_3=activity.power_time_in_zone_3,
        power_time_in_zone_4=activity.power_time_in_zone_4,
        power_time_in_zone_5=activity.power_time_in_zone_5,
        location=activity.location,
        pace=activity.pace,
        temperature_c=weather.temperature_c if weather else None,
        feels_like_c=weather.feels_like_c if weather else None,
        humidity_pct=weather.humidity_pct if weather else None,
        wind_speed_kmh=weather.wind_speed_kmh if weather else None,
        precipitation_mm=weather.precipitation_mm if weather else None,
        weather_condition=weather.condition if weather else None,
    )


@router.post("/sync-garmin", response_model=GarminSyncResult)
def sync_garmin(db: Session = Depends(get_db)) -> GarminSyncResult:
    """Pull recent activities from the Garmin Connect API into
    `activities_raw` (source="garmin_api", deduplicated by Garmin's own
    activity ID), then immediately run the raw-to-processed pipeline so
    `activities`/`weather_conditions` are populated too -- see
    app.ingestion.processor. A sync with no new Garmin activities skips
    the second stage's work entirely (nothing new to process).
    """
    settings = get_settings()
    if not settings.garmin_email or not settings.garmin_password:
        raise HTTPException(status_code=500, detail="GARMIN_EMAIL/GARMIN_PASSWORD not configured")

    user = get_or_create_default_user(db)

    try:
        activities = garmin_api_loader.fetch_new_activities(
            db, user.id, settings.garmin_email, settings.garmin_password
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Garmin login/fetch failed: {exc}") from exc

    raw_result = garmin_api_loader.load(db, user.id, activities)
    process_result = processor.process_new_activities(db, user.id)

    return GarminSyncResult(
        fetched=raw_result.fetched,
        imported=raw_result.imported,
        skipped_duplicates=raw_result.skipped_duplicates,
        processed=process_result.processed,
        skipped_non_running=process_result.skipped_non_running,
        weather_matched=process_result.weather_matched,
        rejected=process_result.rejected,
        rejection_reasons=process_result.rejection_reasons,
    )
