from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    wins = Column(Integer, nullable=False, default=0)
    losses = Column(Integer, nullable=False, default=0)
    rating = Column(Integer, nullable=False, default=1200)
    qr_code = Column(String, unique=True, nullable=False, index=True)
    archetype_sticker_id = Column(
        Integer, ForeignKey("stickers.id", ondelete="SET NULL"), nullable=True
    )

    sticker_inventory = relationship(
        "PlayerSticker",
        back_populates="player",
        cascade="all, delete-orphan",
    )
    archetype_sticker = relationship("Sticker")

    @property
    def archetype_slug(self):
        return self.archetype_sticker.slug if self.archetype_sticker else None
