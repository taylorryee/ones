"""add sticker showcase slot

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-11-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("player_stickers", sa.Column("showcase_slot", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_player_stickers_showcase_slot",
        "player_stickers",
        "showcase_slot >= 0 AND showcase_slot < 3",
    )
    op.create_unique_constraint(
        "uq_player_stickers_showcase_slot",
        "player_stickers",
        ["player_id", "showcase_slot"],
    )
    # The badge wall used to show these three for everyone, so players keep the ones they own.
    op.execute(
        """
        UPDATE player_stickers
        SET showcase_slot = CASE stickers.slug
            WHEN 'thinker' THEN 0
            WHEN 'cone' THEN 1
            WHEN 'goat' THEN 2
        END
        FROM stickers
        WHERE player_stickers.sticker_id = stickers.id
          AND stickers.slug IN ('thinker', 'cone', 'goat')
        """
    )


def downgrade() -> None:
    op.drop_constraint("uq_player_stickers_showcase_slot", "player_stickers", type_="unique")
    op.drop_constraint("ck_player_stickers_showcase_slot", "player_stickers", type_="check")
    op.drop_column("player_stickers", "showcase_slot")
