from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.player import PlayerCreate
from database import get_db
from services import player as service
router = APIRouter(prefix="/players", tags=["players"])

@router.get("/")
def get_players():
    return []


@router.post("/create")
def create_player(player:PlayerCreate,db:Session=Depends(get_db)):
    created = service.create_player(db,player)
    return created