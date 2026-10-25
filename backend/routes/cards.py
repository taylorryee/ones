from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.player import Player
from schemas.cards import BadgeWallContent
from services import cards as service


router = APIRouter(prefix="/cards", tags=["cards"])


# `day` is the player's local date, so the quote changes at their midnight rather than the
# server's.
@router.get("/badge-wall", response_model=BadgeWallContent)
def get_badge_wall_content(
    day: date | None = None,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_badge_wall_content(db, current_user, day or date.today())
