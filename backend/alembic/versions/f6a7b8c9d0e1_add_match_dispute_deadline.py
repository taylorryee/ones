"""add match dispute deadline

Revision ID: f6a7b8c9d0e1
Revises: 05dbe8afd37e
Create Date: 2026-11-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "05dbe8afd37e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "matches",
        sa.Column("dispute_deadline", sa.DateTime(timezone=True), nullable=True),
    )
    # "submitted" (reported, waiting for the other player to confirm, nothing applied yet) is
    # gone. Those matches go back to being played, so either player can report them again.
    op.execute(
        "UPDATE matches SET status = 'pending', winner_id = NULL, submitted_by_id = NULL, "
        "submitted_at = NULL WHERE status = 'submitted'"
    )


def downgrade() -> None:
    op.drop_column("matches", "dispute_deadline")
