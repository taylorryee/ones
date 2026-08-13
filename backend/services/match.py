from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.match import Match
from models.player import Player
from schemas.match import MatchCreate, MatchSubmit, MatchConfirm


def create_match(db: Session, match: MatchCreate):
    player_one = db.query(Player).filter(Player.id == match.playerOne_id).first()
    player_two = db.query(Player).filter(Player.qr_code == match.opp_qr).first()

    if player_one is None:
        raise HTTPException(status_code=404, detail="Player one not found")

    if player_two is None:
        raise HTTPException(status_code=404, detail="Opponent not found")

    if player_one.id == player_two.id:
        raise HTTPException(status_code=400, detail="Players cannot challenge themselves")

    db_match = Match(
        playerOne_id=player_one.id,
        playerTwo_id=player_two.id,
        status="pending",
    )

    db.add(db_match)
    db.commit()
    db.refresh(db_match)

    return db_match


def get_match(db: Session, match_id: int):
    db_match = db.query(Match).filter(Match.id == match_id).first()

    if db_match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    return db_match


def submit_match_result(db: Session, match_id: int, result: MatchSubmit):
    db_match = get_match(db, match_id)

    if db_match.status != "pending":
        raise HTTPException(status_code=400, detail="Match result cannot be submitted")

    player_ids = {db_match.playerOne_id, db_match.playerTwo_id}

    if result.winner_id not in player_ids:
        raise HTTPException(status_code=400, detail="Winner must be in the match")

    if result.submitted_by_id not in player_ids:
        raise HTTPException(status_code=400, detail="Submitter must be in the match")

    db_match.winner_id = result.winner_id
    db_match.playerOne_score = result.playerOne_score
    db_match.playerTwo_score = result.playerTwo_score
    db_match.submitted_by_id = result.submitted_by_id
    db_match.status = "submitted"
    db_match.submitted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_match)

    return db_match


def confirm_match(db: Session, match_id: int, confirmation: MatchConfirm):
    db_match = get_match(db, match_id)

    if db_match.status != "submitted":
        raise HTTPException(status_code=400, detail="Match is not ready to confirm")

    player_ids = {db_match.playerOne_id, db_match.playerTwo_id}

    if confirmation.confirmed_by_id not in player_ids:
        raise HTTPException(status_code=400, detail="Confirmer must be in the match")

    if confirmation.confirmed_by_id == db_match.submitted_by_id:
        raise HTTPException(status_code=400, detail="Submitter cannot confirm their own result")

    winner = db.query(Player).filter(Player.id == db_match.winner_id).first()
    loser_id = db_match.playerTwo_id if db_match.winner_id == db_match.playerOne_id else db_match.playerOne_id
    loser = db.query(Player).filter(Player.id == loser_id).first()

    winner.wins += 1
    loser.losses += 1

    db_match.confirmed_by_id = confirmation.confirmed_by_id
    db_match.status = "confirmed"
    db_match.confirmed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_match)

    return db_match
