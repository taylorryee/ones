import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as authRouter
from routes.cards import router as cardsRouter
from routes.match import router as matchRouter
from routes.player import router as playerRouter
from routes.sticker import router as stickerRouter



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(authRouter)
app.include_router(playerRouter)
app.include_router(matchRouter)
app.include_router(stickerRouter)
app.include_router(cardsRouter)

# Test-bot routes for playing a match on one phone. Off unless backend/.env sets it.
if os.getenv("ENABLE_DEV_ROUTES") == "1":
    from routes.dev import router as devRouter

    app.include_router(devRouter)
