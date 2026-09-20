"""add OG sticker

Revision ID: e5b1d8a4f2c7
Revises: c3f8a1d7e2b9
Create Date: 2026-09-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "e5b1d8a4f2c7"
down_revision: Union[str, Sequence[str], None] = "c3f8a1d7e2b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO stickers (slug, name, asset_uri)
        VALUES ('og-sticker', 'OG Sticker', 'asset://og-sticker')
        ON CONFLICT (slug) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO player_stickers (player_id, sticker_id)
        SELECT players.id, stickers.id
        FROM players
        CROSS JOIN stickers
        WHERE stickers.slug = 'og-sticker'
        ON CONFLICT (player_id, sticker_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM player_stickers
        WHERE sticker_id = (SELECT id FROM stickers WHERE slug = 'og-sticker')
        """
    )
    op.execute("DELETE FROM stickers WHERE slug = 'og-sticker'")
