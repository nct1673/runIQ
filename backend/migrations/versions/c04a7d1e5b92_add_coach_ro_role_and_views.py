"""add coach_ro read-only role and coach.* views

Revision ID: c04a7d1e5b92
Revises: 8c1ccc0c4782
Create Date: 2026-10-15

Gives the AI Coach's free-form SQL tool its own Postgres login. The role
can only SELECT from user-scoped views in the `coach` schema -- it has no
grant on any base table (so users.password_hash etc. are unreachable) and
cannot write, create, or run for long (role-level read-only + timeouts).

Each view filters on current_setting('app.user_id'), which the app sets
per transaction (see app/services/coach/readonly_db.py). If the setting
is missing the view returns zero rows (fail closed).
"""
from typing import Sequence, Union

from alembic import op

from app.core.config import get_settings

revision: str = "c04a7d1e5b92"
down_revision: Union[str, None] = "8c1ccc0c4782"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLE = "coach_ro"
OWNER_FILTER = "user_id = NULLIF(current_setting('app.user_id', true), '')::uuid"

# Columns deliberately left out: external_id, start_latitude/longitude
# (home location), storage_path/error (server internals), display_name,
# date_of_birth, timezone.
VIEWS = {
    "activities": f"""
        SELECT id, source, started_at, distance_km, duration_s, avg_pace_s_per_km,
               avg_hr, avg_cadence, elevation_gain_m, activity_type, activity_name,
               event_type, elapsed_duration_s, moving_duration_s, calories,
               avg_power, norm_power, avg_stride_length, avg_vertical_oscillation,
               avg_vertical_ratio, avg_ground_contact_time, training_effect_label,
               vo2_max, hr_time_in_zone_1, hr_time_in_zone_2, hr_time_in_zone_3,
               hr_time_in_zone_4, hr_time_in_zone_5, location
        FROM public.activities WHERE {OWNER_FILTER}""",
    "weather": f"""
        SELECT w.activity_id, w.temperature_c, w.feels_like_c, w.humidity_pct,
               w.wind_speed_kmh, w.precipitation_mm, w.condition
        FROM public.weather_conditions w
        JOIN public.activities a ON a.id = w.activity_id
        WHERE a.{OWNER_FILTER}""",
    "races": f"""
        SELECT id, name, distance_km, race_date, race_time, location, goal_time_s,
               priority, status, actual_time_s, notes
        FROM public.races WHERE {OWNER_FILTER}""",
    "personal_records": f"""
        SELECT id, label, metric, value, activity_name, achieved_at
        FROM public.personal_records WHERE {OWNER_FILTER}""",
    "video_analyses": f"""
        SELECT id, status, result, uploaded_at, analyzed_at
        FROM public.video_analyses WHERE {OWNER_FILTER}""",
    "profile": f"""
        SELECT sex, height_cm, weight_kg, resting_hr, max_hr, unit_system
        FROM public.user_profiles WHERE {OWNER_FILTER}""",
}


def upgrade() -> None:
    password = get_settings().coach_db_password
    if not password:
        raise RuntimeError("Set COACH_DB_PASSWORD in .env before running this migration")
    pw = password.replace("'", "''")

    op.execute(f"""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{ROLE}') THEN
                CREATE ROLE {ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
            END IF;
        END $$""")
    op.execute(f"ALTER ROLE {ROLE} WITH PASSWORD '{pw}'")
    op.execute(f"ALTER ROLE {ROLE} SET default_transaction_read_only = on")
    op.execute(f"ALTER ROLE {ROLE} SET statement_timeout = '5s'")
    op.execute(f"ALTER ROLE {ROLE} SET lock_timeout = '2s'")
    op.execute(f"ALTER ROLE {ROLE} SET idle_in_transaction_session_timeout = '10s'")
    op.execute(f"ALTER ROLE {ROLE} SET search_path = coach")
    op.execute(f"""
        DO $$ BEGIN
            EXECUTE format('GRANT CONNECT ON DATABASE %I TO {ROLE}', current_database());
        END $$""")

    op.execute("CREATE SCHEMA IF NOT EXISTS coach")
    for name, select in VIEWS.items():
        op.execute(f"CREATE OR REPLACE VIEW coach.{name} AS {select}")
    op.execute(f"GRANT USAGE ON SCHEMA coach TO {ROLE}")
    op.execute(f"GRANT SELECT ON ALL TABLES IN SCHEMA coach TO {ROLE}")
    # Belt and braces: no direct access to the real tables.
    op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {ROLE}")
    op.execute(f"REVOKE CREATE ON SCHEMA public FROM {ROLE}")


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS coach CASCADE")
    op.execute(f"DROP OWNED BY {ROLE}")
    op.execute(f"DROP ROLE IF EXISTS {ROLE}")
