from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.player import Player
from schemas.sticker import (
    BallStickerPlacementWrite,
    BallStickerRead,
    PlayerStickerRead,
    StickerRead,
)
from services import sticker as service


router = APIRouter(prefix="/stickers", tags=["stickers"])


@router.get("/", response_model=list[StickerRead])
def get_sticker_catalog(db: Session = Depends(get_db)):
    return service.get_sticker_catalog(db)


@router.get("/inventory", response_model=list[PlayerStickerRead])
def get_inventory(
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.get_player_inventory(db, current_user.id)


@router.get("/ball/{player_id}", response_model=list[BallStickerRead])
def get_ball_stickers(player_id: int, db: Session = Depends(get_db)):
    return service.get_ball_stickers(db, player_id)


@router.put(
    "/inventory/{player_sticker_id}/placement",
    response_model=BallStickerRead,
)
def place_sticker(
    player_sticker_id: int,
    placement: BallStickerPlacementWrite,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    return service.place_sticker(db, current_user.id, player_sticker_id, placement)


@router.delete(
    "/inventory/{player_sticker_id}/placement",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_sticker_placement(
    player_sticker_id: int,
    db: Session = Depends(get_db),
    current_user: Player = Depends(get_current_user),
):
    service.remove_sticker_placement(db, current_user.id, player_sticker_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
