"""add player auth fields

Revision ID: 12f4a9d0c3bd
Revises: 7232fa0f199c
Create Date: 2026-08-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "12f4a9d0c3bd"
down_revision: Union[str, Sequence[str], None] = "7232fa0f199c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("players", sa.Column("password_hash", sa.String(), nullable=True))
    op.create_index(op.f("ix_players_name"), "players", ["name"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_players_name"), table_name="players")
    op.drop_column("players", "password_hash")
