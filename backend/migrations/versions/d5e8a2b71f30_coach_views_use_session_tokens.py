"""coach views scope by unforgeable session token, not a raw user id

Revision ID: d5e8a2b71f30
Revises: c04a7d1e5b92
Create Date: 2026-10-15

c04a7d1e5b92 filtered the coach.* views on current_setting('app.user_id'),
but a read-only role can still call set_config(), so a query could switch
to another user's id. Now the views resolve the user from
public.coach_sessions via a random token the app inserts (privileged
connection) before handing the session over. coach_ro can't read that
table, and the views run with their owner's rights, so the lookup still
works. A forged/unknown token matches nothing -> zero rows.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d5e8a2b71f30"
down_revision: Union[str, None] = "c04a7d1e5b92"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TOKEN_SCOPE = (
    "(SELECT cs.user_id FROM public.coach_sessions cs "
    "WHERE cs.token = current_setting('app.session_token', true) AND cs.expires_at > now())"
)
OLD_SCOPE = "NULLIF(current_setting('app.user_id', true), '')::uuid"


def _views(scope_expr: str, op_: str) -> dict[str, str]:
    f = f"user_id {op_} {scope_expr}"
    return {
        "activities": f"""
            SELECT id, source, started_at, distance_km, duration_s, avg_pace_s_per_km,
                   avg_hr, avg_cadence, elevation_gain_m, activity_type, activity_name,
                   event_type, elapsed_duration_s, moving_duration_s, calories,
                   avg_power, norm_power, avg_stride_length, avg_vertical_oscillation,
                   avg_vertical_ratio, avg_ground_contact_time, training_effect_label,
                   vo2_max, hr_time_in_zone_1, hr_time_in_zone_2, hr_time_in_zone_3,
                   hr_time_in_zone_4, hr_time_in_zone_5, location
            FROM public.activities WHERE {f}""",
        "weather": f"""
            SELECT w.activity_id, w.temperature_c, w.feels_like_c, w.humidity_pct,
                   w.wind_speed_kmh, w.precipitation_mm, w.condition
            FROM public.weather_conditions w
            JOIN public.activities a ON a.id = w.activity_id
            WHERE a.{f}""",
        "races": f"""
            SELECT id, name, distance_km, race_date, race_time, location, goal_time_s,
                   priority, status, actual_time_s, notes
            FROM public.races WHERE {f}""",
        "personal_records": f"""
            SELECT id, label, metric, value, activity_name, achieved_at
            FROM public.personal_records WHERE {f}""",
        "video_analyses": f"""
            SELECT id, status, result, uploaded_at, analyzed_at
            FROM public.video_analyses WHERE {f}""",
        "profile": f"""
            SELECT sex, height_cm, weight_kg, resting_hr, max_hr, unit_system
            FROM public.user_profiles WHERE {f}""",
    }


def upgrade() -> None:
    op.create_table(
        "coach_sessions",
        sa.Column("token", sa.String(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute("REVOKE ALL ON public.coach_sessions FROM PUBLIC")
    op.execute("REVOKE ALL ON public.coach_sessions FROM coach_ro")
    for name, select in _views(TOKEN_SCOPE, "IN").items():
        op.execute(f"CREATE OR REPLACE VIEW coach.{name} AS {select}")


def downgrade() -> None:
    for name, select in _views(OLD_SCOPE, "=").items():
        op.execute(f"CREATE OR REPLACE VIEW coach.{name} AS {select}")
    op.drop_table("coach_sessions")
