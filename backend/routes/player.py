from fastapi import APIRouter

router = APIRouter(prefix="/players", tags=["players"])

@router.get("/")
def get_players():
    return []


@router.post("/create")
def create_player():
    pass