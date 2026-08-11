from sqlalchemy.orm import Session

from models.player import Player
from schemas.player import PlayerCreate

import uuid




def create_player(db: Session, player: PlayerCreate):
    qr_code=str(uuid.uuid4())
    db_player = Player(
        name=player.name,
        qr_code=qr_code    
    )


    db.add(db_player)
    db.commit()
    db.refresh(db_player)

    return db_player
