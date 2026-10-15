"""add pre-formatted H:MM:SS time columns to coach.personal_records / coach.races

Revision ID: f2b7c9e04d16
Revises: a91c3f5d2e48
Create Date: 2026-10-15

The Coach's LLM mis-converted seconds to H:MM:SS (8067.8s shown as 2:07:47
instead of 2:14:27). The database now does the formatting. New columns are
appended so CREATE OR REPLACE VIEW stays valid; security_barrier is restated
explicitly so it can't be dropped by the replace.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f2b7c9e04d16"
down_revision: Union[str, None] = "a91c3f5d2e48"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCOPE = (
    "user_id IN (SELECT cs.user_id FROM public.coach_sessions cs "
    "WHERE cs.token = current_setting('app.session_token', true) AND cs.expires_at > now())"
)


def _hms(col: str) -> str:
    return f"to_char(make_interval(secs => round({col})::int), 'FMHH24:MI:SS')"


def upgrade() -> None:
    op.execute(f"""
        CREATE OR REPLACE VIEW coach.personal_records WITH (security_barrier = true) AS
        SELECT id, label, metric, value, activity_name, achieved_at,
               CASE WHEN metric = 'time_s' THEN {_hms('value')} END AS time_hms
        FROM public.personal_records WHERE {SCOPE}""")
    op.execute(f"""
        CREATE OR REPLACE VIEW coach.races WITH (security_barrier = true) AS
        SELECT id, name, distance_km, race_date, race_time, location, goal_time_s,
               priority, status, actual_time_s, notes,
               {_hms('goal_time_s')} AS goal_time_hms,
               {_hms('actual_time_s')} AS actual_time_hms
        FROM public.races WHERE {SCOPE}""")


def downgrade() -> None:
    # Dropping columns needs DROP + CREATE; recreate the previous definitions.
    op.execute("DROP VIEW coach.personal_records")
    op.execute("DROP VIEW coach.races")
    op.execute(f"""
        CREATE VIEW coach.personal_records WITH (security_barrier = true) AS
        SELECT id, label, metric, value, activity_name, achieved_at
        FROM public.personal_records WHERE {SCOPE}""")
    op.execute(f"""
        CREATE VIEW coach.races WITH (security_barrier = true) AS
        SELECT id, name, distance_km, race_date, race_time, location, goal_time_s,
               priority, status, actual_time_s, notes
        FROM public.races WHERE {SCOPE}""")
    op.execute("GRANT SELECT ON coach.personal_records, coach.races TO coach_ro")
