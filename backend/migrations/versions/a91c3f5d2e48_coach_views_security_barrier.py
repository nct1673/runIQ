"""make coach.* views security barriers

Revision ID: a91c3f5d2e48
Revises: d5e8a2b71f30
Create Date: 2026-10-15

Without security_barrier, Postgres may push a query's own WHERE clause
below the view's token filter and evaluate it on other users' rows. A
crafted predicate (division by zero, failing cast) then acts as an oracle
for other users' data. With the barrier, the scoping qual always runs
first.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a91c3f5d2e48"
down_revision: Union[str, None] = "d5e8a2b71f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VIEWS = ["activities", "weather", "races", "personal_records", "video_analyses", "profile"]


def upgrade() -> None:
    for name in VIEWS:
        op.execute(f"ALTER VIEW coach.{name} SET (security_barrier = true)")


def downgrade() -> None:
    for name in VIEWS:
        op.execute(f"ALTER VIEW coach.{name} RESET (security_barrier)")
