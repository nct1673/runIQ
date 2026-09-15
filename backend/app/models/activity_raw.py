"""Raw landing-zone table for imported activity data (bronze layer).

Two independent raw sources land here, distinguished by `source`:

- ``"csv_upload"``: one column per Garmin CSV export header (see
  `RAW_COLUMN_MAP`), everything `String` since the CSV source itself is
  all-text. Dedup key: `row_hash`.
- ``"garmin_api"``: one column per `garminconnect.Garmin.get_activities()`
  field, typed to match the API's own JSON types (Float measurements,
  Integer counts/ids, String text, Boolean flags) -- storing them typed
  is fidelity to the source, not processing. Dedup key: Garmin's own
  `garmin_activity_id`, a real unique ID (unlike the CSV path's
  synthetic hash).

Columns exclusive to one source are simply NULL for rows from the other.
Populating/linking either half to `activities` is ingestion-pipeline
work, intentionally left unimplemented here.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# --- csv_upload source -------------------------------------------------

# Original Garmin CSV header -> ActivityRaw column name.
RAW_COLUMN_MAP: dict[str, str] = {
    "Activity Type": "activity_type",
    "Date": "date",
    "Favorite": "favorite",
    "Title": "title",
    "Distance": "distance",
    "Calories": "calories",
    "Time": "time",
    "Avg HR": "avg_hr",
    "Max HR": "max_hr",
    "Aerobic TE": "aerobic_te",
    "Avg Run Cadence": "avg_run_cadence",
    "Max Run Cadence": "max_run_cadence",
    "Avg Pace": "avg_pace",
    "Best Pace": "best_pace",
    "Total Ascent": "total_ascent",
    "Total Descent": "total_descent",
    "Avg Stride Length": "avg_stride_length",
    "Avg Vertical Ratio": "avg_vertical_ratio",
    "Avg Vertical Oscillation": "avg_vertical_oscillation",
    "Avg Ground Contact Time": "avg_ground_contact_time",
    "Avg GAP": "avg_gap",
    "Normalized Power® (NP®)": "normalized_power_np",
    "Training Stress Score®": "training_stress_score",
    "Avg Power": "avg_power",
    "Max Power": "max_power",
    "Steps": "steps",
    "Total Reps": "total_reps",
    "Total Sets": "total_sets",
    "Body Battery Drain": "body_battery_drain",
    "Min Temp": "min_temp",
    "Decompression": "decompression",
    "Best Lap Time": "best_lap_time",
    "Number of Laps": "number_of_laps",
    "Max Temp": "max_temp",
    "Moving Time": "moving_time",
    "Elapsed Time": "elapsed_time",
    "Min Elevation": "min_elevation",
    "Max Elevation": "max_elevation",
}

# --- garmin_api source ---------------------------------------------------

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
        UniqueConstraint("user_id", "row_hash", name="uq_activities_raw_user_row_hash"),
        UniqueConstraint(
            "user_id", "garmin_activity_id", name="uq_activities_raw_user_garmin_activity_id"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    source: Mapped[str] = mapped_column(String, default="csv_upload")
    source_file: Mapped[str | None] = mapped_column(String, nullable=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # -- csv_upload columns (dedup key: row_hash) --
    row_hash: Mapped[str | None] = mapped_column(String, nullable=True)

    activity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    favorite: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    distance: Mapped[str | None] = mapped_column(String, nullable=True)
    calories: Mapped[str | None] = mapped_column(String, nullable=True)
    time: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_hr: Mapped[str | None] = mapped_column(String, nullable=True)
    max_hr: Mapped[str | None] = mapped_column(String, nullable=True)
    aerobic_te: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_run_cadence: Mapped[str | None] = mapped_column(String, nullable=True)
    max_run_cadence: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_pace: Mapped[str | None] = mapped_column(String, nullable=True)
    best_pace: Mapped[str | None] = mapped_column(String, nullable=True)
    total_ascent: Mapped[str | None] = mapped_column(String, nullable=True)
    total_descent: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_stride_length: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_vertical_ratio: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_vertical_oscillation: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_ground_contact_time: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_gap: Mapped[str | None] = mapped_column(String, nullable=True)
    normalized_power_np: Mapped[str | None] = mapped_column(String, nullable=True)
    training_stress_score: Mapped[str | None] = mapped_column(String, nullable=True)
    avg_power: Mapped[str | None] = mapped_column(String, nullable=True)
    max_power: Mapped[str | None] = mapped_column(String, nullable=True)
    steps: Mapped[str | None] = mapped_column(String, nullable=True)
    total_reps: Mapped[str | None] = mapped_column(String, nullable=True)
    total_sets: Mapped[str | None] = mapped_column(String, nullable=True)
    body_battery_drain: Mapped[str | None] = mapped_column(String, nullable=True)
    min_temp: Mapped[str | None] = mapped_column(String, nullable=True)
    decompression: Mapped[str | None] = mapped_column(String, nullable=True)
    best_lap_time: Mapped[str | None] = mapped_column(String, nullable=True)
    number_of_laps: Mapped[str | None] = mapped_column(String, nullable=True)
    max_temp: Mapped[str | None] = mapped_column(String, nullable=True)
    moving_time: Mapped[str | None] = mapped_column(String, nullable=True)
    elapsed_time: Mapped[str | None] = mapped_column(String, nullable=True)
    min_elevation: Mapped[str | None] = mapped_column(String, nullable=True)
    max_elevation: Mapped[str | None] = mapped_column(String, nullable=True)

    # -- garmin_api columns (dedup key: garmin_activity_id) --
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
