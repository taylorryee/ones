import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from auth import create_access_token, hash_password, verify_password
from models.player import Player
from schemas.auth import AuthCredentials


def register_player(db: Session, credentials: AuthCredentials):
    existing_player = db.query(Player).filter(Player.name == credentials.name).first()
    if existing_player is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A player with that name already exists",
        )

    player = Player(
        name=credentials.name,
        password_hash=hash_password(credentials.password),
        qr_code=str(uuid.uuid4()),
    )

    db.add(player)
    db.commit()
    db.refresh(player)

    return create_auth_response(player)


def login_player(db: Session, credentials: AuthCredentials):
    player = db.query(Player).filter(Player.name == credentials.name).first()
    if player is None or not verify_password(credentials.password, player.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid name or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return create_auth_response(player)


def create_auth_response(player: Player):
    access_token = create_access_token({"sub": str(player.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": player,
    }
