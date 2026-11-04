from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.player import Player
from schemas.match import MatchCreate, MatchRead, MatchScore, MatchSubmit, PlayedGame, ResultToAnswer
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


# Every played match with its result, for the stats of a day the player taps on the calendar.
@router.get("/me/games", response_model=list[PlayedGame])
def get_played_games(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_played_games(db, current_user)


# The Play screen polls this so the player who was scanned learns that a match started.
@router.get("/me/active", response_model=MatchRead | None)
def get_active_match(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_active_match(db, current_user.id)


# Results the opponent reported that you haven't answered yet; the badge wall asks about them.
@router.get("/me/to-answer", response_model=list[ResultToAnswer])
def get_results_to_answer(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_results_to_answer(db, current_user)


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
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    submitted = service.submit_match_result(db, match_id, result, current_user.id)

    return submitted


@router.post("/{match_id}/confirm", response_model=MatchRead)
def confirm_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    confirmed = service.confirm_match(db, match_id, current_user.id)

    return confirmed


@router.post("/{match_id}/rematch", response_model=MatchRead)
def rematch(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.rematch(db, match_id, current_user)


@router.post("/{match_id}/score", response_model=MatchRead)
def record_score(
    match_id: int,
    score: MatchScore,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.record_score(db, match_id, score, current_user.id)


# The other player throws out a result they didn't report, before the end of that day.
@router.post("/{match_id}/dispute", response_model=MatchRead)
def dispute_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.dispute_match(db, match_id, current_user.id)
