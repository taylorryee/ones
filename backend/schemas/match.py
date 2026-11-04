from datetime import datetime

from pydantic import BaseModel


class MatchCreate(BaseModel):
    opp_qr: str


class MatchSubmit(BaseModel):
    winner_id: int
    # The phone's getTimezoneOffset(), so the dispute window ends at the reporter's midnight.
    tz_offset_minutes: int = 0


class MatchScore(BaseModel):
    playerOne_score: int
    playerTwo_score: int


class MatchRead(BaseModel):
    id: int
    playerOne_id: int
    playerTwo_id: int
    winner_id: int | None
    playerOne_score: int | None
    playerTwo_score: int | None
    playerOne_win_rating_change: int
    playerOne_loss_rating_change: int
    playerTwo_win_rating_change: int
    playerTwo_loss_rating_change: int
    rating_percent: int
    status: str
    submitted_by_id: int | None
    confirmed_by_id: int | None
    awarded_player_sticker_id: int | None
    sticker_outcome: str | None
    dispute_deadline: datetime | None


    model_config = {
        "from_attributes": True,
    }


# A result the opponent reported, for the other player to agree with or dispute.
class ResultToAnswer(BaseModel):
    id: int
    opponent_name: str
    you_won: bool
    dispute_deadline: datetime


# One of the player's played matches, for the calendar's day stats. rating_change is the
# player's own Elo change (0 for a disputed result, which was thrown out).
class PlayedGame(BaseModel):
    played_at: datetime
    opponent_name: str
    you_won: bool
    rating_change: int
    status: str
