from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.match import Match
from models.player import Player
from models.sticker import PlayerSticker
from schemas.match import MatchCreate, MatchScore, MatchSubmit
from services import sticker as sticker_service


# A match's life: pending (being played) -> reported (one player's result, already applied, can
# still be disputed until the end of that day) -> confirmed (the other player agreed, or the day
# ended) or disputed (the other player disagreed, so the result was undone).
# Only a pending match is active: a reported one doesn't stop either player starting the next.
ACTIVE_MATCH_STATUSES = ["pending"]
# Results that count: Elo, wins and stickers have been applied.
COUNTED_STATUSES = ["reported", "confirmed"]
# Matches that were played, whatever happened to the result.
PLAYED_STATUSES = ["reported", "confirmed", "disputed"]
ELO_K_FACTOR = 32
# A new player's first games move their rating faster, so they reach their real level sooner.
# An established player facing them risks (and gains) less, since the newcomer's rating is
# still a guess. A player is provisional until they have this many rated results (unrated
# rematches tell us nothing about their level, so they don't count).
PROVISIONAL_GAMES = 10
PROVISIONAL_K_FACTOR = 64
VS_PROVISIONAL_K_FACTOR = 16
# Anti-farming: the same two players' games within this window count for less Elo each time.
# The first game is full stakes, then each entry in turn; any game past the list is unrated
# (it still counts for wins, losses and stickers).
REPEAT_WINDOW = timedelta(days=7)
REPEAT_RATING_PERCENTS = [100, 50, 25]
# The phone's offset from UTC can't be more than this, so a bad value can't stretch the window.
MAX_TZ_OFFSET_MINUTES = 14 * 60

def is_provisional(db: Session, player: Player):
    rated_games = (
        db.query(Match.id)
        .filter(
            Match.status.in_(COUNTED_STATUSES),
            Match.rating_percent > 0,
            (Match.playerOne_id == player.id) | (Match.playerTwo_id == player.id),
        )
        .count()
    )
    return rated_games < PROVISIONAL_GAMES

def get_k_factor(db: Session, player: Player, opponent: Player):
    if is_provisional(db, player):
        return PROVISIONAL_K_FACTOR
    if is_provisional(db, opponent):
        return VS_PROVISIONAL_K_FACTOR
    return ELO_K_FACTOR

# The player's chance of beating the opponent, from 0 to 1.
def get_expected_score(player_rating: int, opponent_rating: int):
    return 1 / (1 + 10 ** ((opponent_rating - player_rating) / 400))

# What the player gains for a win and loses for a loss against this opponent (both positive),
# scaled by rating_percent. Each player uses their own K-factor, so the two sides of a match
# needn't add up to zero while either player is provisional.
def get_rating_stakes(db: Session, player: Player, opponent: Player, rating_percent: int):
    k = get_k_factor(db, player, opponent) * rating_percent / 100
    expected = get_expected_score(player.rating, opponent.rating)
    return round(k * (1 - expected)), round(k * expected)

# How much of the normal Elo stakes a new match between these two players is worth, from how many
# counted results they've had against each other within REPEAT_WINDOW.
def get_repeat_rating_percent(db: Session, player_a_id: int, player_b_id: int):
    since = datetime.now(timezone.utc) - REPEAT_WINDOW
    recent_games = (
        db.query(Match.id)
        .filter(
            Match.status.in_(COUNTED_STATUSES),
            Match.submitted_at >= since,
            ((Match.playerOne_id == player_a_id) & (Match.playerTwo_id == player_b_id))
            | ((Match.playerOne_id == player_b_id) & (Match.playerTwo_id == player_a_id)),
        )
        .count()
    )
    if recent_games < len(REPEAT_RATING_PERCENTS):
        return REPEAT_RATING_PERCENTS[recent_games]
    return 0

def get_active_match(db: Session, player_id: int):
    return (
        db.query(Match)
        .filter(
            Match.status.in_(ACTIVE_MATCH_STATUSES),
            (Match.playerOne_id == player_id) | (Match.playerTwo_id == player_id),
        )
        .first()
    )

def player_has_active_match(db: Session, player_id: int):
    return get_active_match(db, player_id) is not None

def has_player_beaten_opponent_before(db: Session, winner_id: int, loser_id: int, exclude_match_id: int):
    return (
        db.query(Match.id)
        .filter(
            Match.status.in_(COUNTED_STATUSES),
            Match.id != exclude_match_id,
            Match.winner_id == winner_id,
            ((Match.playerOne_id == winner_id) & (Match.playerTwo_id == loser_id))
            | ((Match.playerOne_id == loser_id) & (Match.playerTwo_id == winner_id)),
        )
        .first()
        is not None
    )


def create_match(db: Session, match: MatchCreate, player_one: Player):
    player_two = db.query(Player).filter(Player.qr_code == match.opp_qr).first()

    if player_two is None:
        
        raise HTTPException(status_code=404, detail="Opponent not found")

    return start_match(db, player_one, player_two)


# Starts a pending match with the stakes fixed at the players' current ratings, scaled down if
# they've played each other recently.
def start_match(db: Session, player_one: Player, player_two: Player):
    if player_one.id == player_two.id:
        raise HTTPException(status_code=400, detail="Players cannot challenge themselves")

    if player_has_active_match(db, player_one.id):
        raise HTTPException(status_code=400, detail="You already have an active match")

    if player_has_active_match(db, player_two.id):
        raise HTTPException(status_code=400, detail="Opponent already has an active match")

    rating_percent = get_repeat_rating_percent(db, player_one.id, player_two.id)
    one_win, one_loss = get_rating_stakes(db, player_one, player_two, rating_percent)
    two_win, two_loss = get_rating_stakes(db, player_two, player_one, rating_percent)
    db_match = Match(
        playerOne_id=player_one.id,
        playerTwo_id=player_two.id,
        playerOne_win_rating_change=one_win,
        playerOne_loss_rating_change=one_loss,
        playerTwo_win_rating_change=two_win,
        playerTwo_loss_rating_change=two_loss,
        rating_percent=rating_percent,
        status="pending",
    )

    db.add(db_match)
    db.commit()
    db.refresh(db_match)

    return db_match



def get_match(db: Session, match_id: int, lock: bool = False):
    query = db.query(Match).filter(Match.id == match_id)
    if lock:
        # Holds the row until commit, so two reports arriving together are handled one after
        # the other instead of both applying the result.
        query = query.with_for_update()
    db_match = query.first()

    if db_match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    # Under a lock the caller commits, so the lock is held until its own change is saved.
    finalize_if_due(db, db_match, commit=not lock)
    return db_match


# A reported result becomes final once its dispute window has closed. Checked whenever a match
# is read, so no background job is needed.
def finalize_if_due(db: Session, db_match: Match, commit: bool = True):
    if (
        db_match.status == "reported"
        and db_match.dispute_deadline is not None
        and datetime.now(timezone.utc) >= db_match.dispute_deadline
    ):
        db_match.status = "confirmed"
        db_match.confirmed_at = db_match.dispute_deadline
        if commit:
            db.commit()
        else:
            db.flush()


# Midnight at the end of the reporter's day, from their phone's offset to UTC in minutes
# (JavaScript's getTimezoneOffset: positive west of UTC).
def end_of_reporters_day(now: datetime, tz_offset_minutes: int):
    offset = timedelta(
        minutes=max(-MAX_TZ_OFFSET_MINUTES, min(MAX_TZ_OFFSET_MINUTES, tz_offset_minutes))
    )
    local_now = now - offset
    next_local_midnight = (local_now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return next_local_midnight + offset


# When each of the player's matches was played (its result first reported), newest first.
def get_played_times(db: Session, player: Player):
    rows = (
        db.query(Match.submitted_at)
        .filter(
            Match.status.in_(PLAYED_STATUSES),
            Match.submitted_at.isnot(None),
            (Match.playerOne_id == player.id) | (Match.playerTwo_id == player.id),
        )
        .order_by(Match.submitted_at.desc())
        .all()
    )

    return [row.submitted_at for row in rows]


# Each of the player's played matches, newest first, with the opponent and the player's Elo
# change, so the app can show the stats for any day in the phone's own time zone.
def get_played_games(db: Session, player: Player):
    matches = (
        db.query(Match)
        .filter(
            Match.status.in_(PLAYED_STATUSES),
            Match.submitted_at.isnot(None),
            (Match.playerOne_id == player.id) | (Match.playerTwo_id == player.id),
        )
        .order_by(Match.submitted_at.desc())
        .all()
    )
    opponent_ids = {
        m.playerTwo_id if m.playerOne_id == player.id else m.playerOne_id for m in matches
    }
    names = dict(db.query(Player.id, Player.name).filter(Player.id.in_(opponent_ids)).all())

    games = []
    for db_match in matches:
        finalize_if_due(db, db_match)
        you_won = db_match.winner_id == player.id
        if db_match.status == "disputed":
            change = 0
        elif you_won:
            change = get_winner_rating_change(db_match)
        else:
            change = -get_loser_rating_change(db_match)
        opponent_id = db_match.playerTwo_id if db_match.playerOne_id == player.id else db_match.playerOne_id
        games.append(
            {
                "played_at": db_match.submitted_at,
                "opponent_name": names.get(opponent_id, "?"),
                "you_won": you_won,
                "rating_change": change,
                "status": db_match.status,
            }
        )
    return games


def get_player_matches(db: Session, player_id: int):
    player = db.query(Player).filter(Player.id == player_id).first()

    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")

    matches = (
        db.query(Match)
        .filter((Match.playerOne_id == player_id) | (Match.playerTwo_id == player_id))
        .order_by(Match.id.desc())
        .all()
    )
    for db_match in matches:
        finalize_if_due(db, db_match)
    return matches


def get_loser_id(db_match: Match):
    return db_match.playerTwo_id if db_match.winner_id == db_match.playerOne_id else db_match.playerOne_id


def get_winner_rating_change(db_match: Match):
    return (
        db_match.playerOne_win_rating_change
        if db_match.winner_id == db_match.playerOne_id
        else db_match.playerTwo_win_rating_change
    )


def get_loser_rating_change(db_match: Match):
    return (
        db_match.playerTwo_loss_rating_change
        if db_match.winner_id == db_match.playerOne_id
        else db_match.playerOne_loss_rating_change
    )


# Moves Elo and the win/loss counts by `direction` (1 to apply the result, -1 to undo it).
# Done in SQL (rating = rating + x), so another match changing the same player at the same
# moment can't overwrite it.
def shift_record(db: Session, db_match: Match, direction: int):
    gain = get_winner_rating_change(db_match) * direction
    loss = get_loser_rating_change(db_match) * direction
    db.query(Player).filter(Player.id == db_match.winner_id).update(
        {Player.wins: Player.wins + direction, Player.rating: Player.rating + gain},
        synchronize_session=False,
    )
    db.query(Player).filter(Player.id == get_loser_id(db_match)).update(
        {Player.losses: Player.losses + direction, Player.rating: Player.rating - loss},
        synchronize_session=False,
    )


def apply_result(db: Session, db_match: Match):
    shift_record(db, db_match, 1)

    winner_id = db_match.winner_id
    loser = db.query(Player).filter(Player.id == get_loser_id(db_match)).first()
    if (
        loser.archetype_sticker_id is not None
        and not has_player_beaten_opponent_before(db, winner_id, loser.id, db_match.id)
    ):
        owned, outcome = sticker_service.award_archetype_sticker(
            db, winner_id, loser.archetype_sticker_id
        )
        db_match.awarded_player_sticker_id = owned.id
        db_match.sticker_outcome = outcome


# Takes back everything apply_result did and throws the result out. A sticker loses the level
# this match gave it, and is removed (from the ball too) if that was its only level.
def undo_result(db: Session, db_match: Match):
    shift_record(db, db_match, -1)

    if db_match.awarded_player_sticker_id is not None:
        owned = db.query(PlayerSticker).filter(PlayerSticker.id == db_match.awarded_player_sticker_id).first()
        if owned is not None:
            if owned.level > 1:
                owned.level -= 1
            else:
                db.delete(owned)
        db_match.awarded_player_sticker_id = None
        db_match.sticker_outcome = None

    db_match.status = "disputed"


def agree_with_result(db_match: Match, player_id: int):
    db_match.status = "confirmed"
    db_match.confirmed_by_id = player_id
    db_match.confirmed_at = datetime.now(timezone.utc)


# Either player taps who won, in any order. The first tap records the result and applies it
# straight away. A second tap from the other player confirms it if it agrees and throws it out
# if it doesn't.
def submit_match_result(db: Session, match_id: int, result: MatchSubmit, id: int):
    db_match = get_match(db, match_id, lock=True)

    player_ids = {db_match.playerOne_id, db_match.playerTwo_id}

    if id not in player_ids:
        raise HTTPException(status_code=400, detail="Submitter must be in the match")

    if result.winner_id not in player_ids:
        raise HTTPException(status_code=400, detail="Winner must be in the match")

    if db_match.status == "pending":
        now = datetime.now(timezone.utc)
        db_match.winner_id = result.winner_id
        db_match.submitted_by_id = id
        db_match.submitted_at = now
        db_match.dispute_deadline = end_of_reporters_day(now, result.tz_offset_minutes)
        db_match.status = "reported"
        apply_result(db, db_match)
    elif db_match.status == "reported" and id != db_match.submitted_by_id:
        if result.winner_id == db_match.winner_id:
            agree_with_result(db_match, id)
        else:
            undo_result(db, db_match)
    else:
        raise HTTPException(status_code=400, detail="Match result cannot be submitted")

    db.commit()
    db.refresh(db_match)

    return db_match


# The other player's answer to a result they didn't report, while it can still be disputed.
def get_reported_match_to_answer(db: Session, match_id: int, player_id: int):
    db_match = get_match(db, match_id, lock=True)

    if player_id not in (db_match.playerOne_id, db_match.playerTwo_id):
        raise HTTPException(status_code=400, detail="You aren't in this match")

    if player_id == db_match.submitted_by_id:
        raise HTTPException(status_code=400, detail="You reported this result")

    if db_match.status != "reported":
        raise HTTPException(status_code=400, detail="This result can't be changed anymore")

    return db_match


def confirm_match(db: Session, match_id: int, id: int):
    db_match = get_reported_match_to_answer(db, match_id, id)
    agree_with_result(db_match, id)

    db.commit()
    db.refresh(db_match)

    return db_match


def dispute_match(db: Session, match_id: int, id: int):
    db_match = get_reported_match_to_answer(db, match_id, id)
    undo_result(db, db_match)

    db.commit()
    db.refresh(db_match)

    return db_match


# Results the opponent reported that this player hasn't answered, while they can still be
# disputed, oldest first.
def get_results_to_answer(db: Session, player: Player):
    matches = (
        db.query(Match)
        .filter(
            Match.status == "reported",
            Match.submitted_by_id != player.id,
            (Match.playerOne_id == player.id) | (Match.playerTwo_id == player.id),
        )
        .order_by(Match.submitted_at)
        .all()
    )
    results = []
    for db_match in matches:
        finalize_if_due(db, db_match)
        if db_match.status != "reported":
            continue
        reporter = db.query(Player).filter(Player.id == db_match.submitted_by_id).first()
        results.append(
            {
                "id": db_match.id,
                "opponent_name": reporter.name,
                "you_won": db_match.winner_id == player.id,
                "dispute_deadline": db_match.dispute_deadline,
            }
        )
    return results


def get_finished_match_for_player(db: Session, match_id: int, player_id: int, statuses: list[str]):
    db_match = get_match(db, match_id)

    if player_id not in (db_match.playerOne_id, db_match.playerTwo_id):
        raise HTTPException(status_code=400, detail="You aren't in this match")

    if db_match.status not in statuses:
        raise HTTPException(status_code=400, detail="Match isn't finished yet")

    return db_match


# A new match between the same two players. Both phones can tap Rematch: whoever is second
# gets the match the first one started instead of an error.
def rematch(db: Session, match_id: int, player: Player):
    db_match = get_finished_match_for_player(db, match_id, player.id, PLAYED_STATUSES)
    opponent_id = db_match.playerTwo_id if db_match.playerOne_id == player.id else db_match.playerOne_id

    active = get_active_match(db, player.id)
    if active is not None and opponent_id in (active.playerOne_id, active.playerTwo_id):
        return active

    opponent = db.query(Player).filter(Player.id == opponent_id).first()
    return start_match(db, player, opponent)


# The points, recorded once the result is in. They have to agree with the winner.
def record_score(db: Session, match_id: int, score: MatchScore, player_id: int):
    db_match = get_finished_match_for_player(db, match_id, player_id, COUNTED_STATUSES)

    if score.playerOne_score < 0 or score.playerTwo_score < 0:
        raise HTTPException(status_code=400, detail="Scores can't be negative")

    player_one_won = db_match.winner_id == db_match.playerOne_id
    if (score.playerOne_score > score.playerTwo_score) != player_one_won or (
        score.playerOne_score == score.playerTwo_score
    ):
        raise HTTPException(status_code=400, detail="The winner needs the higher score")

    db_match.playerOne_score = score.playerOne_score
    db_match.playerTwo_score = score.playerTwo_score

    db.commit()
    db.refresh(db_match)

    return db_match

