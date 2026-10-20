"""planned runs

Revision ID: a3c81d27b5e4
Revises: f2b7c9e04d16
Create Date: 2026-10-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3c81d27b5e4'
down_revision: Union[str, None] = 'f2b7c9e04d16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('planned_runs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('planned_date', sa.Date(), nullable=False),
    sa.Column('run_type', sa.String(), nullable=False),
    sa.Column('distance_km', sa.Float(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_planned_runs_planned_date'), 'planned_runs', ['planned_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_planned_runs_planned_date'), table_name='planned_runs')
    op.drop_table('planned_runs')
