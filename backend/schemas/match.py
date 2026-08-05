from pydantic import BaseModel

class MatchCreate(BaseModel):
  opp_qr:str

class MatchSubmit(BaseModel):
  winner_id:str


# MatchSubmit:
#   winner_id
#   playerOne_score
#   playerTwo_score

# MatchRead:
#   id
#   playerOne_id
#   playerTwo_id
#   winner_id
#   playerOne_score
#   playerTwo_score
#   status