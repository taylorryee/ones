from sqlalchemy import Column, Integer, String

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
