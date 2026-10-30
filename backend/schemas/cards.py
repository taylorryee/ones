from pydantic import BaseModel


# Shown as ONES <chapter>:<verse>.
class Quote(BaseModel):
    chapter: int
    verse: int
    text: str
    author: str


class PlayerStats(BaseModel):
    wins: int
    losses: int
    # Positive for a run of wins, negative for a run of losses, 0 before the first match.
    streak: int
    week_wins: int
    week_losses: int


# What the cards at the bottom of the badge wall show. Add a field here for each new card that
# needs data from the server.
class BadgeWallContent(BaseModel):
    quote: Quote
    stats: PlayerStats
    # Every verse in order, for the book the quote card opens.
    verses: list[Quote]
