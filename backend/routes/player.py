from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from auth import get_current_user
from models.player import Player
from schemas.player import PlayerCreate, PlayerRead
from database import get_db
from services import player as service
router = APIRouter(prefix="/players", tags=["players"])

@router.get("/", response_model=list[PlayerRead])
def get_players(db:Session=Depends(get_db)):
    players = service.get_players(db)
    
    return players


@router.get("/profile",response_model = PlayerRead)
def get_profile(current_user: Player = Depends(get_current_user)):
    return current_user


@router.post("/create")
def create_player(player:PlayerCreate,db:Session=Depends(get_db)):
    created = service.create_player(db,player)
    return created

