from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models.match import Match
from models.player import Player
from schemas.cards import BadgeWallContent, PlayerStats, Quote


# The daily quotes, numbered like Bible verses: the third quote of the second chapter is ONES 2:3.
# One is shown per day, starting with 1:1 on FIRST_DAY and going through every chapter in order,
# then starting again from 1:1. Add verses to the end of a chapter or start a new chapter freely;
# inserting or moving one renumbers the verses after it.
FIRST_DAY = date(2026, 10, 25)
CHAPTERS = [
    [
        (
            "I've failed over and over and over again in my life. And that is why I succeed.",
            "Michael Jordan",
        ),
        (
            "Everything negative – pressure, challenges – is all an opportunity for me to rise.",
            "Kobe Bryant",
        ),
        ("Success is not an accident, success is actually a choice.", "Stephen Curry"),
        ("Talent wins games, but teamwork and intelligence win championships.", "Michael Jordan"),
        (
            "Ask not what your teammates can do for you. Ask what you can do for your teammates.",
            "Magic Johnson",
        ),
        (
            "Some people want it to happen, some wish it would happen, others make it happen.",
            "Michael Jordan",
        ),
        (
            "I can accept failure, everyone fails at something. But I can't accept not trying.",
            "Michael Jordan",
        ),
    ],
]
VERSES = [
    Quote(chapter=chapter_number, verse=verse_number, text=text, author=author)
    for chapter_number, chapter in enumerate(CHAPTERS, start=1)
    for verse_number, (text, author) in enumerate(chapter, start=1)
]

WEEK = timedelta(days=7)


def quote_of_the_day(day: date):
    return VERSES[(day - FIRST_DAY).days % len(VERSES)]


def player_stats(db: Session, player: Player):
    matches = (
        db.query(Match)
        .filter(
            Match.status == "confirmed",
            (Match.playerOne_id == player.id) | (Match.playerTwo_id == player.id),
        )
        .order_by(Match.confirmed_at.desc())
        .all()
    )

    # Counts back from the newest match until the result changes.
    streak = 0
    for match in matches:
        step = 1 if match.winner_id == player.id else -1
        if streak != 0 and (streak > 0) != (step > 0):
            break
        streak += step

    week_ago = datetime.now(timezone.utc) - WEEK
    this_week = [match for match in matches if match.confirmed_at >= week_ago]
    week_wins = sum(1 for match in this_week if match.winner_id == player.id)

    return PlayerStats(
        wins=player.wins,
        losses=player.losses,
        streak=streak,
        week_wins=week_wins,
        week_losses=len(this_week) - week_wins,
    )


def get_badge_wall_content(db: Session, player: Player, day: date):
    return BadgeWallContent(
        quote=quote_of_the_day(day),
        stats=player_stats(db, player),
    )
