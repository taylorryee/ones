"""add match awarded sticker

Revision ID: b2d3e4f5g6h7
Revises: a1c2d3e4f5g6
Create Date: 2026-09-21 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2d3e4f5g6h7"
down_revision: Union[str, Sequence[str], None] = "a1c2d3e4f5g6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "matches",
        sa.Column("awarded_player_sticker_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_matches_awarded_player_sticker_id_player_stickers",
        "matches",
        "player_stickers",
        ["awarded_player_sticker_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_matches_awarded_player_sticker_id_player_stickers",
        "matches",
        type_="foreignkey",
    )
    op.drop_column("matches", "awarded_player_sticker_id")
