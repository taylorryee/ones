from fastapi import FastAPI

from database import Base, engine
from models.player import Player   # <-- Important!
from routes.player import router as playerRouter

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(playerRouter)


