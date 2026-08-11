from fastapi import FastAPI

from routes.player import router as playerRouter


app = FastAPI()

app.include_router(playerRouter)


