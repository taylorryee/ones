# models/player.py
from sqlalchemy import String, Integer,Column
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Player(Base):
    __tablename__ = "players"
    id = Column(Integer,primary_key=True)
    name = Column(String,nullable=False)
    wins = Column(Integer,nullable=False,default=0)
    losses = Column(Integer,nullable=False,default=0)
    rating = Column(Integer,nullable=False,default=1200)
    qr_code = Column(String,unique=True,nullable=False,index=True)
