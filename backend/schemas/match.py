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
    status: str
    submitted_by_id: int | None
    confirmed_by_id: int | None
    

    model_config = {
        "from_attributes": True,
    }
