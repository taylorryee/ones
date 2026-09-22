"""add signature stickers

Revision ID: a1c2d3e4f5g6
Revises: e5b1d8a4f2c7
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1c2d3e4f5g6"
down_revision: Union[str, Sequence[str], None] = "e5b1d8a4f2c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "stickers",
        sa.Column("owner_player_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_stickers_owner_player_id_players",
        "stickers",
        "players",
        ["owner_player_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_stickers_owner_player_id"),
        "stickers",
        ["owner_player_id"],
        unique=True,
    )

    op.execute(
        """
        INSERT INTO stickers (slug, name, asset_uri, owner_player_id)
        SELECT 'signature-' || players.id, players.name || '''s Sticker', 'asset://og-sticker', players.id
        FROM players
        WHERE NOT EXISTS (
            SELECT 1 FROM stickers WHERE stickers.owner_player_id = players.id
        )
        """
    )
    op.execute(
        """
        INSERT INTO player_stickers (player_id, sticker_id)
        SELECT stickers.owner_player_id, stickers.id
        FROM stickers
        WHERE stickers.owner_player_id IS NOT NULL
        ON CONFLICT (player_id, sticker_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM player_stickers
        WHERE sticker_id IN (SELECT id FROM stickers WHERE owner_player_id IS NOT NULL)
        """
    )
    op.execute("DELETE FROM stickers WHERE owner_player_id IS NOT NULL")

    op.drop_index(op.f("ix_stickers_owner_player_id"), table_name="stickers")
    op.drop_constraint(
        "fk_stickers_owner_player_id_players", "stickers", type_="foreignkey"
    )
    op.drop_column("stickers", "owner_player_id")
