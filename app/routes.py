from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
import uuid
import asyncio

# Use absolute imports 
import app.models
import app.utils
import app.game_logic

# Get references to shared resources
game_rooms = app.utils.game_rooms
generate_room_code = app.utils.generate_room_code
broadcast_to_room = app.utils.broadcast_to_room

# Import from game_logic
generate_puzzles = app.game_logic.generate_puzzles
run_game_timer = app.game_logic.run_game_timer

# Import model classes
Player = app.models.Player
GameRoom = app.models.GameRoom

# Templates will be imported from main.py
templates = None

router = APIRouter()


# Routes
@router.get("/", response_class=HTMLResponse)
async def landing_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/create", response_class=HTMLResponse)
async def create_game(request: Request):
    return templates.TemplateResponse("create.html", {"request": request})


@router.get("/join", response_class=HTMLResponse)
async def join_game(request: Request):
    return templates.TemplateResponse("join.html", {"request": request})


@router.get("/game/{room_code}", response_class=HTMLResponse)
async def game_page(request: Request, room_code: str):
    if room_code not in game_rooms:
        return templates.TemplateResponse(
            "error.html", {"request": request, "message": "Game room not found"}
        )
    return templates.TemplateResponse(
        "game.html", {"request": request, "room_code": room_code}
    )


# API endpoints
@router.post("/api/rooms/create")
async def create_room(host_name: str):
    room_code = generate_room_code()
    player_id = str(uuid.uuid4())

    player = Player(
        id=player_id,
        name=host_name,
        role="",  # Will be selected later
        room_code=room_code,
        is_host=True,
    )

    game_rooms[room_code] = GameRoom(code=room_code, players={player_id: player})

    return {"room_code": room_code, "player_id": player_id}


@router.post("/api/rooms/join")
async def join_room(room_code: str, player_name: str):
    if room_code not in game_rooms:
        return {"error": "Room not found"}

    room = game_rooms[room_code]
    if room.status != "waiting":
        return {"error": "Game already in progress"}

    player_id = str(uuid.uuid4())
    player = Player(
        id=player_id,
        name=player_name,
        role="",  # Will be selected later
        room_code=room_code,
        is_host=False,
    )

    room.players[player_id] = player

    return {"room_code": room_code, "player_id": player_id}


@router.post("/api/roles/select")
async def select_role(player_id: str, room_code: str, role: str):
    if room_code not in game_rooms:
        return {"error": "Room not found"}

    room = game_rooms[room_code]
    if player_id not in room.players:
        return {"error": "Player not found"}

    # Check if role is already taken
    for p_id, player in room.players.items():
        if player.role == role and p_id != player_id:
            return {"error": "Role already taken"}

    # Assign role
    room.players[player_id].role = role

    # Prepare player data for response
    player_data = {
        "id": player_id,
        "name": room.players[player_id].name,
        "role": role,
        "connected": room.players[player_id].connected,
        "is_host": room.players[player_id].is_host,
    }

    # Broadcast role confirmation to all players
    await broadcast_to_room(
        room_code, 
        {
            "type": "role_confirmed", 
            "player_id": player_id, 
            "role": role,
            "player": player_data,  # Include full player data
            "players": {
                pid: {
                    "id": pid,  # Include ID in the player data
                    "name": p.name,
                    "role": p.role if pid == player_id else (p.role if p.role else ""),  # Show roles that are already selected
                    "connected": p.connected,
                    "is_host": p.is_host,
                }
                for pid, p in room.players.items()
            }
        }
    )

    return {
        "success": True, 
        "player": player_data,
        "players": {
            pid: {
                "id": pid,
                "name": p.name,
                "role": p.role if pid == player_id else (p.role if p.role else ""),
                "connected": p.connected,
                "is_host": p.is_host,
            }
            for pid, p in room.players.items()
        }
    }


@router.post("/api/game/start")
async def start_game(room_code: str, player_id: str = None):
    if room_code not in game_rooms:
        return {"error": "Room not found"}

    room = game_rooms[room_code]
    
    # If player_id is provided, verify the player is the host
    if player_id:
        if player_id not in room.players:
            return {"error": "Player not found"}
        if not room.players[player_id].is_host:
            return {"error": "Only the host can start the game"}
    
    # Check if the game is already in progress
    if room.status != "waiting":
        return {"error": "Game is already in progress"}
    
    # Check if there are at least 2 players
    if len(room.players) < 2:
        return {"error": "At least 2 players are required to start the game"}

    # Check if all players have roles
    players_without_roles = []
    for pid, player in room.players.items():
        if not player.role:
            players_without_roles.append(player.name)
    
    if players_without_roles:
        return {
            "error": f"Not all players have selected roles: {', '.join(players_without_roles)}"
        }

    # Initialize game state
    room.status = "in_progress"
    room.stage = 1
    room.alert_level = 0
    room.timer = 300  # 5 minutes

    # Initialize puzzles for stage 1
    room.puzzles = generate_puzzles(room, 1)

    # Broadcast game start to all players
    await broadcast_to_room(
        room_code, {"type": "game_started", "stage": room.stage, "timer": room.timer}
    )

    # Start the game timer
    asyncio.create_task(run_game_timer(room_code))

    return {"success": True} 