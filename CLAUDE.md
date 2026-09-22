# CLAUDE.md

## Project Overview

This is a mobile app for real-world 1v1 basketball.

Players challenge each other in person, play a real basketball game, record the result, and build a persistent competitive identity.

Core product loop:

1. Find another player
2. Scan their QR code
3. Create a match
4. Play the game in real life
5. Submit the result
6. Opponent confirms or disputes the result
7. Update player record/rating
8. Winner earns the opponent's sticker
9. Stickers can be placed on the player's basketball

The product should encourage real-world basketball and social interaction rather than replacing it with an online game.

## Product Philosophy

This is an MVP being built by a solo developer.

Optimize for:

- simplicity
- fast iteration
- maintainability
- good mobile UX
- clear architecture

Avoid:

- premature abstraction
- unnecessary infrastructure
- speculative future-proofing
- adding dependencies without a clear reason
- building features that were not requested

When there are multiple valid approaches, prefer the simplest approach that supports the current product requirements.

## Architecture

frontend/
├── app/                  Expo Router screens
├── components/           Reusable visual components
├── services/             Typed API functions
├── assets/               Basketball and sticker artwork
├── api.ts                Axios client and authentication interceptor
└── constants/api.ts      Backend URL

backend/
├── main.py               FastAPI application and router registration
├── auth.py               JWT and authentication dependencies
├── database.py           SQLAlchemy engine and sessions
├── models/               SQLAlchemy database models
├── schemas/              Pydantic request/response models
├── routes/               HTTP endpoint definitions
├── services/             Business and database logic
└── alembic/              Database migrations

Routes should remain thin.

HTTP parsing, validation, and response handling belong in routes/.
Business rules and database operations belong in backend/services/.

## Engineering Rules
Inspect relevant existing code before implementing.

Follow existing patterns unless there is a clear reason to change them.

Keep changes scoped to the requested task.

Do not refactor unrelated code.

Do not add dependencies without explaining why.

Prefer the simplest MVP implementation.

Do not claim a feature works unless it has been verified.



## Verification
Before considering a task complete:

Run relevant tests.
Run TypeScript checks for frontend changes.
Verify affected API flows for backend changes.
Check for errors introduced by the change.
Clearly state what was and was not tested.