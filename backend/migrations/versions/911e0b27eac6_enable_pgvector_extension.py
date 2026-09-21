"""enable pgvector extension

Revision ID: 911e0b27eac6
Revises: 72841a4c1fc6
Create Date: 2026-09-18 15:23:21.385374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '911e0b27eac6'
down_revision: Union[str, None] = '72841a4c1fc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pgvector/pgvector:pg16 (the Postgres image in docker-compose.yml)
    # ships the extension; it just isn't enabled in this database yet.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS vector")
