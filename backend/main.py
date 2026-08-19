from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as authRouter
from routes.match import router as matchRouter
from routes.player import router as playerRouter



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(authRouter)
app.include_router(playerRouter)
app.include_router(matchRouter)
