import random
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.match import Match
from models.player import Player
from models.sticker import PlayerSticker, Sticker
from schemas.match import MatchCreate, MatchSubmit
from services import match as match_service
from services import sticker as sticker_service


# A player with no password, so it can't log in. It only acts through the dev routes.
TEST_BOT_NAME = "Test Bot"
TEST_BOT_ARCHETYPE = "goat"


def get_test_bot(db: Session):
    bot = db.query(Player).filter(Player.name == TEST_BOT_NAME).first()
    if bot is not None:
        return bot

    # Has an archetype like a real player, so beating it awards its sticker.
    archetype = db.query(Sticker).filter(Sticker.slug == TEST_BOT_ARCHETYPE).first()
    bot = Player(
        name=TEST_BOT_NAME,
        qr_code=str(uuid.uuid4()),
        archetype_sticker_id=archetype.id if archetype else None,
    )
    db.add(bot)
    db.flush()
    if archetype is not None:
        bot.sticker_inventory.append(PlayerSticker(sticker=archetype))
    db.commit()
    db.refresh(bot)
    return bot


# Throws away a match left unfinished with the bot, so a new test can always start.
def reset_test_bot(db: Session):
    bot = get_test_bot(db)

    stale = match_service.get_active_match(db, bot.id)
    if stale is not None:
        db.delete(stale)
        db.commit()

    return bot


# The bot scans the player's code, through the real challenge code.
def bot_scans_player(db: Session, player: Player):
    bot = reset_test_bot(db)
    return match_service.create_match(db, MatchCreate(opp_qr=player.qr_code), bot)


def get_bot_match(db: Session, match_id: int):
    bot = get_test_bot(db)
    db_match = match_service.get_match(db, match_id)
    if bot.id not in (db_match.playerOne_id, db_match.playerTwo_id):
        raise HTTPException(status_code=400, detail="The test bot isn't in this match")
    return bot, db_match


def bot_submit(db: Session, match_id: int, bot_won: bool):
    bot, db_match = get_bot_match(db, match_id)
    opponent_id = db_match.playerTwo_id if db_match.playerOne_id == bot.id else db_match.playerOne_id
    result = MatchSubmit(
        winner_id=bot.id if bot_won else opponent_id,
    )
    return match_service.submit_match_result(db, match_id, result, bot.id)


# Gives the player a random archetype sticker through the real award code (a new one, or a
# level on one they own), so the sticker reward animation can be tested after any match.
def award_random_badge(db: Session, player: Player):
    stickers = db.query(Sticker).filter(Sticker.slug.in_(sticker_service.ARCHETYPE_SLUGS)).all()
    if not stickers:
        raise HTTPException(status_code=404, detail="No archetype stickers to award")

    owned, outcome = sticker_service.award_archetype_sticker(db, player.id, random.choice(stickers).id)
    db.commit()
    return {"player_sticker_id": owned.id, "outcome": outcome}
