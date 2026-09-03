"""add match elo changes

Revision ID: 9a7e3d2c1b4f
Revises: 12f4a9d0c3bd
Create Date: 2026-09-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9a7e3d2c1b4f"
down_revision: Union[str, Sequence[str], None] = "12f4a9d0c3bd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("playerOne_win_rating_change", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("matches", sa.Column("playerTwo_win_rating_change", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("matches", "playerTwo_win_rating_change")
    op.drop_column("matches", "playerOne_win_rating_change")
