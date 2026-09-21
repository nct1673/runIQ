"""Raw landing-zone table for imported activity data (bronze layer).

Sourced entirely from the Garmin Connect API
(`garminconnect.Garmin.get_activities()`, see
`app/ingestion/garmin_api_loader.py`) -- one column per API field, typed
to match the API's own JSON types (Float measurements, Integer
counts/ids, String text, Boolean flags). Dedup key: `garmin_activity_id`,
Garmin's own real unique ID.

A manual CSV-upload source existed earlier in the project but was
retired once the Garmin API sync replaced it as the only import method
-- see git history for `raw_loader.py`/`csv_parser.py` if that's ever
wanted again.
"""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# garminconnect activity-summary field -> ActivityRaw column name.
# Nested fields (activityType.typeKey, eventType.typeKey) are accessed
# structurally, not transformed -- same kind of access as picking a
# named cell out of a CSV row.
API_COLUMN_MAP: dict[str, str] = {
    "activityId": "garmin_activity_id",
    "activityName": "api_activity_name",
    "activityType": "api_activity_type",  # .typeKey
    "eventType": "api_event_type",  # .typeKey
    "startTimeLocal": "api_start_time_local",
    "startTimeGMT": "api_start_time_gmt",
    "distance": "api_distance",
    "duration": "api_duration",
    "elapsedDuration": "api_elapsed_duration",
    "movingDuration": "api_moving_duration",
    "calories": "api_calories",
    "bmrCalories": "api_bmr_calories",
    "averageHR": "api_average_hr",
    "maxHR": "api_max_hr",
    "averageRunningCadenceInStepsPerMinute": "api_average_running_cadence",
    "maxRunningCadenceInStepsPerMinute": "api_max_running_cadence",
    "averageSpeed": "api_average_speed",
    "maxSpeed": "api_max_speed",
    "avgGradeAdjustedSpeed": "api_avg_grade_adjusted_speed",
    "avgPower": "api_avg_power",
    "maxPower": "api_max_power",
    "normPower": "api_norm_power",
    "elevationGain": "api_elevation_gain",
    "elevationLoss": "api_elevation_loss",
    "minElevation": "api_min_elevation",
    "maxElevation": "api_max_elevation",
    "avgStrideLength": "api_avg_stride_length",
    "avgVerticalOscillation": "api_avg_vertical_oscillation",
    "avgVerticalRatio": "api_avg_vertical_ratio",
    "avgGroundContactTime": "api_avg_ground_contact_time",
    "startLatitude": "api_start_latitude",
    "startLongitude": "api_start_longitude",
    "endLatitude": "api_end_latitude",
    "endLongitude": "api_end_longitude",
    "steps": "api_steps",
    "lapCount": "api_lap_count",
    "minTemperature": "api_min_temperature",
    "maxTemperature": "api_max_temperature",
    "aerobicTrainingEffect": "api_aerobic_training_effect",
    "aerobicTrainingEffectMessage": "api_aerobic_training_effect_message",
    "anaerobicTrainingEffect": "api_anaerobic_training_effect",
    "anaerobicTrainingEffectMessage": "api_anaerobic_training_effect_message",
    "trainingEffectLabel": "api_training_effect_label",
    "vO2MaxValue": "api_v_o2_max_value",
    "differenceBodyBattery": "api_difference_body_battery",
    "hrTimeInZone_1": "api_hr_time_in_zone_1",
    "hrTimeInZone_2": "api_hr_time_in_zone_2",
    "hrTimeInZone_3": "api_hr_time_in_zone_3",
    "hrTimeInZone_4": "api_hr_time_in_zone_4",
    "hrTimeInZone_5": "api_hr_time_in_zone_5",
    "powerTimeInZone_1": "api_power_time_in_zone_1",
    "powerTimeInZone_2": "api_power_time_in_zone_2",
    "powerTimeInZone_3": "api_power_time_in_zone_3",
    "powerTimeInZone_4": "api_power_time_in_zone_4",
    "powerTimeInZone_5": "api_power_time_in_zone_5",
    "isFavorite": "api_is_favorite",
    "isPR": "api_is_pr",
    "deviceId": "api_device_id",
    "manufacturer": "api_manufacturer",
}


class ActivityRaw(Base):
    __tablename__ = "activities_raw"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "garmin_activity_id", name="uq_activities_raw_user_garmin_activity_id"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    source: Mapped[str] = mapped_column(String, default="garmin_api")
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    garmin_activity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    api_activity_name: Mapped[str | None] = mapped_column(String, nullable=True)
    api_activity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    api_event_type: Mapped[str | None] = mapped_column(String, nullable=True)
    api_start_time_local: Mapped[str | None] = mapped_column(String, nullable=True)
    api_start_time_gmt: Mapped[str | None] = mapped_column(String, nullable=True)
    api_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_elapsed_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_moving_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_bmr_calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_average_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_max_hr: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_average_running_cadence: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_max_running_cadence: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_average_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_max_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_avg_grade_adjusted_speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_avg_power: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_max_power: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_norm_power: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_elevation_gain: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_elevation_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_min_elevation: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_max_elevation: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_avg_stride_length: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_avg_vertical_oscillation: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_avg_vertical_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_avg_ground_contact_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_start_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_start_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_end_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_end_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    api_lap_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    api_min_temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_max_temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_aerobic_training_effect: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_aerobic_training_effect_message: Mapped[str | None] = mapped_column(String, nullable=True)
    api_anaerobic_training_effect: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_anaerobic_training_effect_message: Mapped[str | None] = mapped_column(String, nullable=True)
    api_training_effect_label: Mapped[str | None] = mapped_column(String, nullable=True)
    api_v_o2_max_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_difference_body_battery: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_hr_time_in_zone_1: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_hr_time_in_zone_2: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_hr_time_in_zone_3: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_hr_time_in_zone_4: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_hr_time_in_zone_5: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_power_time_in_zone_1: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_power_time_in_zone_2: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_power_time_in_zone_3: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_power_time_in_zone_4: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_power_time_in_zone_5: Mapped[float | None] = mapped_column(Float, nullable=True)
    api_is_favorite: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    api_is_pr: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    api_device_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    api_manufacturer: Mapped[str | None] = mapped_column(String, nullable=True)
