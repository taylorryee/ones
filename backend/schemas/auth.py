from pydantic import BaseModel

from schemas.player import PlayerRead


class AuthCredentials(BaseModel):
    name: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PlayerRead
