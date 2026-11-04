"""add match loss rating changes

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-11-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "matches",
        sa.Column("playerOne_loss_rating_change", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "matches",
        sa.Column("playerTwo_loss_rating_change", sa.Integer(), nullable=False, server_default="0"),
    )
    # Older matches were zero-sum: a player lost what their opponent would have gained.
    op.execute(
        'UPDATE matches SET "playerOne_loss_rating_change" = "playerTwo_win_rating_change", '
        '"playerTwo_loss_rating_change" = "playerOne_win_rating_change"'
    )


def downgrade() -> None:
    op.drop_column("matches", "playerTwo_loss_rating_change")
    op.drop_column("matches", "playerOne_loss_rating_change")
