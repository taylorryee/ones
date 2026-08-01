from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)

    playerOne_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    playerTwo_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)

    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    playerOne_score = Column(Integer, nullable=True)
    playerTwo_score = Column(Integer, nullable=True)

    status = Column(String, nullable=False, default="pending")

    submitted_by_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    confirmed_by_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)