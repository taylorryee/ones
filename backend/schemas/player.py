from pydantic import BaseModel


class PlayerCreate(BaseModel):
    name: str



class PlayerUpdate(BaseModel):
    name: str | None = None


class PlayerRead(BaseModel):
    id: int
    name: str
    wins: int
    losses: int
    rating: int
    qr_code: str
    archetype_slug: str | None = None

    model_config = {
        "from_attributes": True,
    }
