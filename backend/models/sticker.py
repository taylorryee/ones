from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class Sticker(Base):
    __tablename__ = "stickers"

    id = Column(Integer, primary_key=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    asset_uri = Column(String, nullable=False)

    player_stickers = relationship("PlayerSticker", back_populates="sticker")


class PlayerSticker(Base):
    __tablename__ = "player_stickers"
    __table_args__ = (
        UniqueConstraint("player_id", "sticker_id", name="uq_player_stickers_owner_asset"),
    )

    id = Column(Integer, primary_key=True)
    player_id = Column(
        Integer,
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sticker_id = Column(
        Integer,
        ForeignKey("stickers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    earned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    level = Column(Integer, nullable=False, default=1, server_default="1")

    player = relationship("Player", back_populates="sticker_inventory")
    sticker = relationship("Sticker", back_populates="player_stickers")
    ball_placement = relationship(
        "BallSticker",
        back_populates="player_sticker",
        cascade="all, delete-orphan",
        uselist=False,
    )


class BallSticker(Base):
    __tablename__ = "ball_stickers"
    __table_args__ = (
        CheckConstraint("u >= 0 AND u <= 1", name="ck_ball_stickers_u_normalized"),
        CheckConstraint("v >= 0 AND v <= 1", name="ck_ball_stickers_v_normalized"),
        CheckConstraint("scale > 0", name="ck_ball_stickers_scale_positive"),
    )

    id = Column(Integer, primary_key=True)
    player_sticker_id = Column(
        Integer,
        ForeignKey("player_stickers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    u = Column(Float, nullable=False)
    v = Column(Float, nullable=False)
    scale = Column(Float, nullable=False, default=1.0)
    rotation = Column(Float, nullable=False, default=0.0)
    z_index = Column(Integer, nullable=False, default=0)

    player_sticker = relationship("PlayerSticker", back_populates="ball_placement")

    @property
    def sticker(self):
        return self.player_sticker.sticker
