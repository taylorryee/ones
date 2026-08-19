from datetime import datetime, timedelta
import hashlib
import os
import secrets
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from dotenv import load_dotenv

from database import get_db
from models.player import Player


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return f"{salt}:{password_hash}"


def verify_password(password: str, stored_password_hash: str | None) -> bool:
    if stored_password_hash is None:
        return False

    salt, expected_hash = stored_password_hash.split(":", 1)
    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return secrets.compare_digest(actual_hash, expected_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    if SECRET_KEY is None:
        raise RuntimeError("SECRET_KEY must be set")

    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if authorization is None or not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.split(" ", 1)[1]

    player_id = decode_token(token)
    player = db.query(Player).filter(Player.id == player_id).first()
    if player is None:
        raise credentials_exception

    return player


def decode_token(token: str):
    if SECRET_KEY is None:
        raise RuntimeError("SECRET_KEY must be set")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        player_id = payload.get("sub")
        if player_id is None:
            raise credentials_exception
        return int(player_id)
    except JWTError:
        raise credentials_exception
