"""add archetype stickers

Revision ID: d4e5f6a7b8c9
Revises: b2d3e4f5g6h7
Create Date: 2026-09-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "b2d3e4f5g6h7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "player_stickers",
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "matches",
        sa.Column("sticker_outcome", sa.String(), nullable=True),
    )

    op.execute(
        """
        INSERT INTO stickers (slug, name, asset_uri) VALUES
          ('sniper','Sniper','asset://archetype-sniper'),
          ('slasher','Slasher','asset://archetype-slasher'),
          ('thinker','Thinker','asset://archetype-thinker'),
          ('bully','Bully','asset://archetype-bully')
        ON CONFLICT (slug) DO NOTHING
        """
    )

    op.add_column(
        "players",
        sa.Column("archetype_sticker_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_players_archetype_sticker_id_stickers",
        "players",
        "stickers",
        ["archetype_sticker_id"],
        ["id"],
        ondelete="SET NULL",
    )

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


def downgrade() -> None:
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

    op.drop_constraint(
        "fk_players_archetype_sticker_id_stickers", "players", type_="foreignkey"
    )
    op.drop_column("players", "archetype_sticker_id")

    op.execute(
        """
        DELETE FROM player_stickers
        WHERE sticker_id IN (SELECT id FROM stickers WHERE slug IN ('sniper','slasher','thinker','bully'))
        """
    )
    op.execute(
        "DELETE FROM stickers WHERE slug IN ('sniper','slasher','thinker','bully')"
    )

    op.drop_column("matches", "sticker_outcome")
    op.drop_column("player_stickers", "level")
