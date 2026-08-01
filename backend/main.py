from fastapi import FastAPI, Depends
from routes.player import router as playerRouter


app = FastAPI()


app.include_router(playerRouter)



