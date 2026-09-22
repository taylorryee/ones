from pydantic import BaseModel


class MatchCreate(BaseModel):
    opp_qr: str


class MatchSubmit(BaseModel):
    winner_id: int
    playerOne_score: int | None
    playerTwo_score: int | None


class MatchRead(BaseModel):
    id: int
    playerOne_id: int
    playerTwo_id: int
    winner_id: int | None
    playerOne_score: int | None
    playerTwo_score: int | None
    playerOne_win_rating_change: int
    playerTwo_win_rating_change: int
    status: str
    submitted_by_id: int | None
    confirmed_by_id: int | None
    awarded_player_sticker_id: int | None
    sticker_outcome: str | None


    model_config = {
        "from_attributes": True,
    }
