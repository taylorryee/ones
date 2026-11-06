from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from models.player import Player
from models.sticker import BallSticker, PlayerSticker, Sticker
from schemas.sticker import BallStickerPlacementWrite

ARCHETYPE_SLUGS = (
    "sniper",
    "slasher",
    "thinker",
    "bully",
    "cone",
    "goat",
    "lockdown",
    "trash",
)


def get_sticker_catalog(db: Session):
    return db.query(Sticker).order_by(Sticker.name, Sticker.id).all()


def get_player_inventory(db: Session, player_id: int):
    return (
        db.query(PlayerSticker)
        .options(
            selectinload(PlayerSticker.sticker),
            selectinload(PlayerSticker.ball_placement),
        )
        .filter(PlayerSticker.player_id == player_id)
        .order_by(PlayerSticker.earned_at, PlayerSticker.id)
        .all()
    )


def get_ball_stickers(db: Session, player_id: int):
    if db.query(Player.id).filter(Player.id == player_id).first() is None:
        raise HTTPException(status_code=404, detail="Player not found")

    return (
        db.query(BallSticker)
        .join(BallSticker.player_sticker)
        .options(
            selectinload(BallSticker.player_sticker).selectinload(PlayerSticker.sticker),
        )
        .filter(PlayerSticker.player_id == player_id)
        .order_by(BallSticker.z_index, BallSticker.id)
        .all()
    )


def award_archetype_sticker(db: Session, player_id: int, sticker_id: int):
    owned_sticker = (
        db.query(PlayerSticker)
        .filter(PlayerSticker.player_id == player_id, PlayerSticker.sticker_id == sticker_id)
        .first()
    )
    if owned_sticker is not None:
        owned_sticker.level += 1
        return owned_sticker, "leveled_up"

    owned_sticker = PlayerSticker(player_id=player_id, sticker_id=sticker_id, level=1)
    db.add(owned_sticker)
    db.flush()
    return owned_sticker, "unlocked"


def set_showcase(db: Session, player_id: int, slots: list[int | None]):
    chosen = [player_sticker_id for player_sticker_id in slots if player_sticker_id is not None]
    if len(chosen) != len(set(chosen)):
        raise HTTPException(status_code=400, detail="A badge can only fill one slot")

    owned = {
        owned_sticker.id: owned_sticker
        for owned_sticker in db.query(PlayerSticker).filter(PlayerSticker.player_id == player_id)
    }
    if any(player_sticker_id not in owned for player_sticker_id in chosen):
        raise HTTPException(status_code=404, detail="Owned sticker not found")

    # Cleared first, so two badges trading places never hold one slot at once.
    for owned_sticker in owned.values():
        owned_sticker.showcase_slot = None
    db.flush()

    for slot, player_sticker_id in enumerate(slots):
        if player_sticker_id is not None:
            owned[player_sticker_id].showcase_slot = slot
    db.commit()


def place_sticker(
    db: Session,
    player_id: int,
    player_sticker_id: int,
    placement: BallStickerPlacementWrite,
):
    owned_sticker = (
        db.query(PlayerSticker)
        .filter(
            PlayerSticker.id == player_sticker_id,
            PlayerSticker.player_id == player_id,
        )
        .first()
    )
    if owned_sticker is None:
        raise HTTPException(status_code=404, detail="Owned sticker not found")

    values = placement.model_dump()
    if owned_sticker.ball_placement is None:
        owned_sticker.ball_placement = BallSticker(**values)
    else:
        for field, value in values.items():
            setattr(owned_sticker.ball_placement, field, value)

    db.commit()
    db.refresh(owned_sticker.ball_placement)
    return owned_sticker.ball_placement


def remove_sticker_placement(db: Session, player_id: int, player_sticker_id: int):
    placement = (
        db.query(BallSticker)
        .join(BallSticker.player_sticker)
        .filter(
            BallSticker.player_sticker_id == player_sticker_id,
            PlayerSticker.player_id == player_id,
        )
        .first()
    )
    if placement is None:
        raise HTTPException(status_code=404, detail="Sticker placement not found")

    db.delete(placement)
    db.commit()
