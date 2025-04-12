from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
import uuid
import asyncio
import json

# Use absolute imports 
import app.models
import app.utils
import app.game_logic
import app.redis_client

# Import Redis functions
from app.redis_client import (
    store_room_data, 
    get_room_data,
    store_player_data,
    get_player_data,
    associate_player_with_room,
    get_player_room,
    cleanup_player_data
)

# Get references to shared resources
game_rooms = app.utils.game_rooms  # Keep this for compatibility during transition
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


@router.get("/join/{room_code}", response_class=HTMLResponse)
async def join_game_with_code(request: Request, room_code: str):
    # Check if room exists in Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return templates.TemplateResponse(
            "error.html", 
            {"request": request, "message": "Game room not found"}
        )
    
    # Pass room_code to the template
    return templates.TemplateResponse(
        "join.html", 
        {
            "request": request,
            "room_code": room_code
        }
    )


@router.get("/game/{room_code}", response_class=HTMLResponse)
async def game_page(request: Request, room_code: str):
    # Get player_id from query parameters
    player_id = request.query_params.get("player_id")
    
    # Check if room exists in Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return templates.TemplateResponse(
            "error.html", {"request": request, "message": "Game room not found"}
        )
    
    # Check if player is in the room (if player_id is provided)
    if player_id:
        player_room = get_player_room(player_id)
        if not player_room or player_room != room_code:
            return templates.TemplateResponse(
                "error.html", 
                {"request": request, "message": "Player not found in this room"}
            )
    
    # Pass room_code and player_id to the template
    return templates.TemplateResponse(
        "game.html", 
        {
            "request": request, 
            "room_code": room_code,
            "player_id": player_id
        }
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

    # Create game room
    game_room = GameRoom(code=room_code, players={player_id: player})
    
    # Store in Redis
    room_data = game_room.dict()
    player_data = player.dict()
    
    store_room_data(room_code, room_data)
    store_player_data(player_id, player_data)
    associate_player_with_room(player_id, room_code)
    
    # Also keep in memory for now (for compatibility)
    game_rooms[room_code] = game_room

    # Return data that client needs
    return {
        "room_code": room_code, 
        "player_id": player_id, 
        "player_name": host_name,
        "session_id": player_id  # This will be used for authentication
    }


@router.post("/api/rooms/join")
async def join_room(room_code: str, player_name: str):
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return {"error": "Room not found"}

    # Create room object
    room = GameRoom(**room_data)
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

    # Update players in room
    room.players[player_id] = player
    
    # Update in Redis
    store_room_data(room_code, room.dict())
    store_player_data(player_id, player.dict())
    associate_player_with_room(player_id, room_code)
    
    # Update in-memory for compatibility
    if room_code in game_rooms:
        game_rooms[room_code].players[player_id] = player
    else:
        game_rooms[room_code] = room

    return {
        "room_code": room_code, 
        "player_id": player_id, 
        "player_name": player_name,
        "session_id": player_id  # This will be used for authentication
    }


@router.post("/api/roles/select")
async def select_role(player_id: str, room_code: str, role: str):
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return {"error": "Room not found"}

    # Create room object
    room = GameRoom(**room_data)
    
    # Check if player is in room
    if player_id not in room.players:
        return {"error": "Player not found"}

    # Check if role is already taken
    for p_id, player_data in room.players.items():
        player = Player(**player_data) if isinstance(player_data, dict) else player_data
        if player.role == role and p_id != player_id:
            return {"error": "Role already taken"}

    # Assign role
    if isinstance(room.players[player_id], dict):
        room.players[player_id]["role"] = role
    else:
        room.players[player_id].role = role
        
    # Update player data in Redis
    player_data = get_player_data(player_id)
    if player_data:
        player_data["role"] = role
        store_player_data(player_id, player_data)
    
    # Update room data in Redis
    store_room_data(room_code, room.dict())
    
    # Update in-memory for compatibility
    if room_code in game_rooms:
        if player_id in game_rooms[room_code].players:
            game_rooms[room_code].players[player_id].role = role

    # Prepare player data for response
    player_obj = Player(**room.players[player_id]) if isinstance(room.players[player_id], dict) else room.players[player_id]
    player_data = {
        "id": player_id,
        "name": player_obj.name,
        "role": role,
        "connected": player_obj.connected,
        "is_host": player_obj.is_host,
    }

    # Prepare all players data
    all_players = {}
    for pid, p_data in room.players.items():
        p = Player(**p_data) if isinstance(p_data, dict) else p_data
        all_players[pid] = {
            "id": pid,
            "name": p.name,
            "role": p.role if pid == player_id else (p.role if p.role else ""),
            "connected": p.connected,
            "is_host": p.is_host,
        }

    # Broadcast role confirmation to all players
    await broadcast_to_room(
        room_code, 
        {
            "type": "role_confirmed", 
            "player_id": player_id, 
            "role": role,
            "player": player_data,
            "players": all_players
        }
    )

    return {
        "success": True, 
        "player": player_data,
        "players": all_players
    }


@router.post("/api/game/start")
async def start_game(room_code: str, player_id: str = None):
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return {"error": "Room not found"}

    # Create room object
    room = GameRoom(**room_data)
    
    # If player_id is provided, verify the player is the host
    if player_id:
        player_in_room = False
        is_host = False
        
        for pid, player_data in room.players.items():
            if pid == player_id:
                player_in_room = True
                player = Player(**player_data) if isinstance(player_data, dict) else player_data
                is_host = player.is_host
                break
                
        if not player_in_room:
            return {"error": "Player not found"}
        if not is_host:
            return {"error": "Only the host can start the game"}
    
    # Check if the game is already in progress
    if room.status != "waiting":
        return {"error": "Game is already in progress"}
    
    # Check if there are at least 2 players
    if len(room.players) < 2:
        return {"error": "At least 2 players are required to start the game"}

    # Check if all players have roles
    players_without_roles = []
    for pid, player_data in room.players.items():
        player = Player(**player_data) if isinstance(player_data, dict) else player_data
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

    # Update room in Redis
    store_room_data(room_code, room.dict())
    
    # Update in-memory for compatibility
    if room_code in game_rooms:
        game_rooms[room_code] = room

    # Broadcast game start to all players
    await broadcast_to_room(
        room_code, {"type": "game_started", "stage": room.stage, "timer": room.timer}
    )

    # Start the game timer
    asyncio.create_task(run_game_timer(room_code))

    return {"success": True}


@router.post("/api/game/leave")
async def leave_game(player_id: str):
    """
    Handle a player leaving the game. This will clean up player data
    and notify other players in the room.
    """
    try:
        # Get the room code for this player
        room_code = get_player_room(player_id)
        if not room_code:
            return {"error": "Player not in a room"}
        
        # Get player data to send in the notification
        player_data = get_player_data(player_id)
        if not player_data:
            return {"error": "Player data not found"}
        
        # Clean up the player data
        cleanup_result = cleanup_player_data(player_id)
        
        # Notify other players that this player has left
        await broadcast_to_room(
            room_code, 
            {
                "type": "player_left", 
                "player_id": player_id,
                "player_name": player_data.get("name", "Unknown player"),
            }
        )
        
        return {"success": cleanup_result}
    except Exception as e:
        print(f"Error while handling player leave: {e}")
        return {"error": str(e)} 