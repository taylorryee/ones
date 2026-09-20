"""add sticker system

Revision ID: c3f8a1d7e2b9
Revises: 9a7e3d2c1b4f
Create Date: 2026-09-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f8a1d7e2b9"
down_revision: Union[str, Sequence[str], None] = "9a7e3d2c1b4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stickers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("asset_uri", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stickers_slug"), "stickers", ["slug"], unique=True)

    op.create_table(
        "player_stickers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("sticker_id", sa.Integer(), nullable=False),
        sa.Column(
            "earned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sticker_id"], ["stickers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "player_id",
            "sticker_id",
            name="uq_player_stickers_owner_asset",
        ),
    )
    op.create_index(
        op.f("ix_player_stickers_player_id"),
        "player_stickers",
        ["player_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_player_stickers_sticker_id"),
        "player_stickers",
        ["sticker_id"],
        unique=False,
    )

    op.create_table(
        "ball_stickers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("player_sticker_id", sa.Integer(), nullable=False),
        sa.Column("u", sa.Float(), nullable=False),
        sa.Column("v", sa.Float(), nullable=False),
        sa.Column("scale", sa.Float(), server_default="1", nullable=False),
        sa.Column("rotation", sa.Float(), server_default="0", nullable=False),
        sa.Column("z_index", sa.Integer(), server_default="0", nullable=False),
        sa.CheckConstraint("scale > 0", name="ck_ball_stickers_scale_positive"),
        sa.CheckConstraint("u >= 0 AND u <= 1", name="ck_ball_stickers_u_normalized"),
        sa.CheckConstraint("v >= 0 AND v <= 1", name="ck_ball_stickers_v_normalized"),
        sa.ForeignKeyConstraint(
            ["player_sticker_id"],
            ["player_stickers.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ball_stickers_player_sticker_id"),
        "ball_stickers",
        ["player_sticker_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_ball_stickers_player_sticker_id"),
        table_name="ball_stickers",
    )
    op.drop_table("ball_stickers")
    op.drop_index(op.f("ix_player_stickers_sticker_id"), table_name="player_stickers")
    op.drop_index(op.f("ix_player_stickers_player_id"), table_name="player_stickers")
    op.drop_table("player_stickers")
    op.drop_index(op.f("ix_stickers_slug"), table_name="stickers")
    op.drop_table("stickers")
