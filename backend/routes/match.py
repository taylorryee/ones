from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.match import MatchConfirm, MatchCreate, MatchRead, MatchSubmit
from services import match as service


router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/challenge", response_model=MatchRead)
def create_match(match: MatchCreate, db: Session = Depends(get_db)):
    created = service.create_match(db, match)

    return created


@router.get("/{match_id}", response_model=MatchRead)
def get_match(match_id: int, db: Session = Depends(get_db)):
    db_match = service.get_match(db, match_id)

    return db_match


@router.post("/{match_id}/submit", response_model=MatchRead)
def submit_match_result(match_id: int, result: MatchSubmit, db: Session = Depends(get_db)):
    submitted = service.submit_match_result(db, match_id, result)

    return submitted


@router.post("/{match_id}/confirm", response_model=MatchRead)
def confirm_match(match_id: int, confirmation: MatchConfirm, db: Session = Depends(get_db)):
    confirmed = service.confirm_match(db, match_id, confirmation)

    return confirmed
