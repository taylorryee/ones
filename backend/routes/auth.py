from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.player import Player
from schemas.auth import AuthCredentials, TokenResponse
from schemas.player import PlayerRead
from services import auth as service


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(credentials: AuthCredentials, db: Session = Depends(get_db)):
    return service.register_player(db, credentials)


@router.post("/login", response_model=TokenResponse)
def login(credentials: AuthCredentials, db: Session = Depends(get_db)):
    return service.login_player(db, credentials)


@router.get("/me", response_model=PlayerRead)
def get_me(current_user: Player = Depends(get_current_user)):
    return current_user
