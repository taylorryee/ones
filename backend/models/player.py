# models/player.py
from sqlalchemy import String, Integer,Column
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Player(Base):
    __tablename__ = "players"
    id = Column(Integer,primary_key=True)
    name = Column(String,nullable=False)
    wins = Column(Integer)
    losses = Column(Integer)
    rating = Column(Integer)
    qr_code = Column(String,unique=True,nullable=False,index=True)
