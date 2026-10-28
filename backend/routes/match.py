from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.player import Player
from schemas.match import MatchCreate, MatchRead, MatchSubmit
from services import match as service


router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/challenge", response_model=MatchRead)
def create_match(
    match: MatchCreate,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    created = service.create_match(db, match, current_user)

    return created


# Times only, so the app can count games in the player's own months and days.
@router.get("/me/played", response_model=list[datetime])
def get_played_times(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_played_times(db, current_user)


# The Play screen polls this so the player who was scanned learns that a match started.
@router.get("/me/active", response_model=MatchRead | None)
def get_active_match(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_active_match(db, current_user.id)


@router.get("/player/{player_id}", response_model=list[MatchRead])
def get_player_matches(player_id: int, db: Session = Depends(get_db)):
    matches = service.get_player_matches(db, player_id)

    return matches


@router.get("/{match_id}", response_model=MatchRead)
def get_match(match_id: int, db: Session = Depends(get_db)):
    db_match = service.get_match(db, match_id)

    return db_match


@router.post("/{match_id}/submit", response_model=MatchRead)
def submit_match_result(
    match_id: int,
    result: MatchSubmit,
    id:int,
    db: Session = Depends(get_db),
    #current_user: Player = Depends(get_current_user),
):
    submitted = service.submit_match_result(db, match_id, result, id)#current_user)

    return submitted


@router.post("/{match_id}/confirm", response_model=MatchRead)
def confirm_match(
    match_id: int,
    id:int,
    db: Session = Depends(get_db)):
    #current_user: Player = Depends(get_current_user),

    confirmed = service.confirm_match(db, match_id,id)# current_user)

    return confirmed
