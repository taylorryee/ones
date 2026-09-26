"""add more archetype stickers

Revision ID: 05dbe8afd37e
Revises: d4e5f6a7b8c9
Create Date: 2026-09-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "05dbe8afd37e"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO stickers (slug, name, asset_uri) VALUES
          ('cone','Cone','asset://archetype-cone'),
          ('goat','Goat','asset://archetype-goat'),
          ('lockdown','Lockdown','asset://archetype-lockdown'),
          ('trash','Trash','asset://archetype-trash')
        ON CONFLICT (slug) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM player_stickers
        WHERE sticker_id IN (
            SELECT id FROM stickers WHERE slug IN ('cone','goat','lockdown','trash')
        )
        """
    )
    op.execute(
        "DELETE FROM stickers WHERE slug IN ('cone','goat','lockdown','trash')"
    )
