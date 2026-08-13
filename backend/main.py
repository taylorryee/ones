from fastapi import FastAPI

from routes.match import router as matchRouter
from routes.player import router as playerRouter


app = FastAPI()

app.include_router(playerRouter)
app.include_router(matchRouter)

