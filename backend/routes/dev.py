from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.player import Player
from schemas.match import MatchRead
from services import dev as service


# The bot reports through the real submit code: first to report, or second to agree/disagree.
# Only registered when ENABLE_DEV_ROUTES=1 (see main.py). Lets one phone play a whole match
# against a test bot, without scanning a second phone.
router = APIRouter(prefix="/dev", tags=["dev"])


class TestBotRead(BaseModel):
    id: int
    qr_code: str


class BotSubmit(BaseModel):
    bot_won: bool


@router.get("/test-bot", response_model=TestBotRead)
def get_test_bot(db: Session = Depends(get_db)):
    return service.get_test_bot(db)


# Clears the bot's unfinished match and returns its QR code, for the app to scan as usual.
@router.post("/test-bot/reset", response_model=TestBotRead)
def reset_test_bot(db: Session = Depends(get_db)):
    return service.reset_test_bot(db)


# The bot scans you. Your Play screen notices the new match the same way it would a real one.
@router.post("/bot-scans-me", response_model=MatchRead)
def bot_scans_me(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.bot_scans_player(db, current_user)


@router.post("/test-match/{match_id}/bot-submit", response_model=MatchRead)
def bot_submit(match_id: int, body: BotSubmit, db: Session = Depends(get_db)):
    return service.bot_submit(db, match_id, body.bot_won)
