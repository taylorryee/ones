from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
import enum

from database import Base


    
class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)

    playerOne_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    playerTwo_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)

    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)


    playerOne_score = Column(Integer, nullable=True)
    playerTwo_score = Column(Integer, nullable=True)

    playerOne_win_rating_change = Column(Integer, nullable=False, default=0)
    playerTwo_win_rating_change = Column(Integer, nullable=False, default=0)
    # Share of the normal Elo stakes this match is worth (lower for repeat opponents).
    rating_percent = Column(Integer, nullable=False, default=100, server_default="100")

    status = Column(String, nullable=False, default="pending")  # see services/match.py

    submitted_by_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    confirmed_by_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    awarded_player_sticker_id = Column(
        Integer, ForeignKey("player_stickers.id", ondelete="SET NULL"), nullable=True
    )
    sticker_outcome = Column(String, nullable=True)  # unlocked, leveled_up

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    # The end of the reporter's day: until then the other player can dispute the result.
    dispute_deadline = Column(DateTime(timezone=True), nullable=True)
