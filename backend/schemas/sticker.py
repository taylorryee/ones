from datetime import datetime

from pydantic import BaseModel, Field


class StickerRead(BaseModel):
    id: int
    slug: str
    name: str
    asset_uri: str

    model_config = {"from_attributes": True}


class BallStickerPlacementWrite(BaseModel):
    u: float = Field(ge=0, le=1)
    v: float = Field(ge=0, le=1)
    scale: float = Field(default=1.0, gt=0)
    rotation: float = 0.0
    z_index: int = 0


class BallStickerPlacementRead(BallStickerPlacementWrite):
    id: int
    player_sticker_id: int

    model_config = {"from_attributes": True}


class BallStickerRead(BallStickerPlacementRead):
    sticker: StickerRead


class PlayerStickerRead(BaseModel):
    id: int
    player_id: int
    earned_at: datetime
    level: int
    sticker: StickerRead
    ball_placement: BallStickerPlacementRead | None

    model_config = {"from_attributes": True}
