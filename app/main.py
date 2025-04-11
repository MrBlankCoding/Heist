# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import uuid
from typing import Dict, List, Optional
import json
import asyncio
import random

app = FastAPI(title="The Heist Game")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Models
class Player(BaseModel):
    id: str
    name: str
    role: str
    room_code: str
    connected: bool = True
    is_host: bool = False


class GameRoom(BaseModel):
    code: str
    players: Dict[str, Player] = {}
    stage: int = 0
    alert_level: int = 0
    timer: int = 300  # 5 minutes default
    status: str = "waiting"  # waiting, in_progress, completed, failed
    puzzles: Dict = {}
    next_events_visible: bool = False  # Add field for Lookout power
    # Timer vote related fields
    timer_vote_active: bool = False
    timer_votes: Dict = {"yes": [], "no": []}
    timer_vote_initiator: Optional[str] = None
    timer_vote_time_limit: int = 20


# In-memory storage (would use a database in production)
game_rooms: Dict[str, GameRoom] = {}
connected_players: Dict[str, WebSocket] = {}

# Helper functions
def generate_room_code() -> str:
    """Generate a unique 4-character room code"""
    while True:
        code = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=4))
        if code not in game_rooms:
            return code


# Routes
@app.get("/", response_class=HTMLResponse)
async def landing_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/create", response_class=HTMLResponse)
async def create_game(request: Request):
    return templates.TemplateResponse("create.html", {"request": request})


@app.get("/join", response_class=HTMLResponse)
async def join_game(request: Request):
    return templates.TemplateResponse("join.html", {"request": request})


@app.get("/game/{room_code}", response_class=HTMLResponse)
async def game_page(request: Request, room_code: str):
    if room_code not in game_rooms:
        return templates.TemplateResponse(
            "error.html", {"request": request, "message": "Game room not found"}
        )
    return templates.TemplateResponse(
        "game.html", {"request": request, "room_code": room_code}
    )


# API endpoints
@app.post("/api/rooms/create")
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


@app.post("/api/rooms/join")
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


@app.post("/api/roles/select")
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


@app.post("/api/game/start")
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


def generate_puzzles(room: GameRoom, stage: int) -> Dict:
    """Generate puzzles for the given stage and room"""
    puzzles = {}

    # Generate role-specific puzzles
    for player_id, player in room.players.items():
        role = player.role
        if role == "Hacker":
            puzzles[player_id] = generate_hacker_puzzle(stage)
        elif role == "Safe Cracker":
            puzzles[player_id] = generate_safe_cracker_puzzle(stage)
        elif role == "Demolitions":
            puzzles[player_id] = generate_demolitions_puzzle(stage)
        elif role == "Lookout":
            puzzles[player_id] = generate_lookout_puzzle(stage)

    # Add team puzzles if needed
    if stage >= 3:
        puzzles["team"] = generate_team_puzzle(stage)

    return puzzles


def generate_hacker_puzzle(stage: int) -> Dict:
    """Generate a puzzle for the Hacker role"""
    # Simplified example - in a real game, this would be more complex
    puzzle_types = {
        1: "circuit",
        2: "password_crack",
        3: "firewall_bypass",
        4: "encryption_key",
        5: "system_override",
    }

    return {
        "type": puzzle_types[stage],
        "difficulty": stage,
        "data": generate_circuit_puzzle(stage) if stage == 1 else {},
    }


def generate_circuit_puzzle(stage: int) -> Dict:
    """Generate a circuit puzzle for stage 1"""
    # Simple example - would be more complex in production
    return {
        "grid_size": 5,
        "start_point": [0, 2],
        "end_point": [4, 2],
        "barriers": [[1, 1], [2, 3], [3, 1]],
        "switches": [[1, 3], [3, 3]],
        "solution": [[0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [3, 2], [4, 2]],
    }


def generate_safe_cracker_puzzle(stage: int) -> Dict:
    # Simplified example
    return {"type": f"safe_puzzle_{stage}", "difficulty": stage, "data": {}}


def generate_demolitions_puzzle(stage: int) -> Dict:
    # Simplified example
    return {"type": f"demo_puzzle_{stage}", "difficulty": stage, "data": {}}


def generate_lookout_puzzle(stage: int) -> Dict:
    # Simplified example
    return {"type": f"lookout_puzzle_{stage}", "difficulty": stage, "data": {}}


def generate_team_puzzle(stage: int) -> Dict:
    # Simplified example
    return {
        "type": f"team_puzzle_{stage}",
        "difficulty": stage,
        "required_roles": ["Hacker", "Safe Cracker"]
        if stage == 3
        else ["Hacker", "Safe Cracker", "Demolitions", "Lookout"],
        "data": {},
    }


async def run_game_timer(room_code: str):
    """Run the game timer for a room"""
    room = game_rooms[room_code]

    while room.timer > 0 and room.status == "in_progress":
        await asyncio.sleep(1)
        room.timer -= 1

        # Send timer updates every 5 seconds to reduce traffic
        if room.timer % 5 == 0 or room.timer <= 10:
            await broadcast_to_room(
                room_code, {"type": "timer_update", "timer": room.timer}
            )

        # Check for random events every 30 seconds
        if room.timer % 30 == 0:
            await trigger_random_event(room_code)

        # Game over when timer runs out
        if room.timer <= 0:
            room.status = "failed"
            await broadcast_to_room(
                room_code, {"type": "game_over", "result": "time_expired"}
            )


async def trigger_random_event(room_code: str):
    """Trigger a random event in the game"""
    room = game_rooms[room_code]

    # Higher alert level = more chance of events
    if random.random() < (0.2 + (room.alert_level * 0.1)):
        event_types = ["security_patrol", "camera_sweep", "system_check"]
        event = random.choice(event_types)
        event_duration = random.randint(5, 15)
        
        # If Lookout's power is active, send a warning to all players
        if room.next_events_visible:
            # Send warning 5 seconds before event
            await broadcast_to_room(
                room_code,
                {
                    "type": "lookout_warning",
                    "event": event,
                    "warning_time": 5,
                    "message": f"Lookout detects {event.replace('_', ' ').title()} approaching in 5 seconds!"
                }
            )
            # Wait 5 seconds before triggering the event
            await asyncio.sleep(5)

        # Send the actual event
        await broadcast_to_room(
            room_code,
            {"type": "random_event", "event": event, "duration": event_duration},
        )


async def broadcast_to_room(room_code: str, message: Dict):
    """Broadcast a message to all players in a room"""
    if room_code not in game_rooms:
        return

    room = game_rooms[room_code]
    message_json = json.dumps(message)

    for player_id in room.players:
        if player_id in connected_players:
            await connected_players[player_id].send_text(message_json)


@app.websocket("/ws/{room_code}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, player_id: str):
    await websocket.accept()

    if room_code not in game_rooms:
        await websocket.send_json({"error": "Room not found"})
        await websocket.close()
        return

    room = game_rooms[room_code]
    if player_id not in room.players:
        await websocket.send_json({"error": "Player not found"})
        await websocket.close()
        return

    # Store the WebSocket connection
    connected_players[player_id] = websocket

    # Mark player as connected
    room.players[player_id].connected = True

    # Send initial game state to the new player
    await websocket.send_json(
        {
            "type": "game_state",
            "room": room_code,
            "stage": room.stage,
            "status": room.status,
            "timer": room.timer,
            "alert_level": room.alert_level,
            "players": {
                pid: {
                    "id": pid,
                    "name": p.name,
                    "role": p.role,  # Send all roles, not just current player's
                    "connected": p.connected,
                    "is_host": p.is_host,
                }
                for pid, p in room.players.items()
            },
        }
    )

    # Broadcast player connected to all other players
    await broadcast_to_room(
        room_code,
        {
            "type": "player_connected",
            "player": {
                "id": player_id,
                "name": room.players[player_id].name,
                "role": room.players[player_id].role,  # Include the role
                "connected": True,
                "is_host": room.players[player_id].is_host,
            },
        },
    )

    if room.status == "in_progress":
        # Send puzzle data
        if player_id in room.puzzles:
            await websocket.send_json(
                {"type": "puzzle_data", "puzzle": room.puzzles[player_id]}
            )

    try:
        # Main WebSocket message loop
        while True:
            data = await websocket.receive_text()
            await process_websocket_message(room_code, player_id, json.loads(data))
    except WebSocketDisconnect:
        # Mark player as disconnected
        if player_id in room.players:
            room.players[player_id].connected = False
        if player_id in connected_players:
            del connected_players[player_id]

        # Notify other players
        await broadcast_to_room(
            room_code, {"type": "player_disconnected", "player_id": player_id}
        )


async def process_websocket_message(room_code: str, player_id: str, message: Dict):
    """Process a message from a WebSocket client"""
    room = game_rooms[room_code]

    msg_type = message.get("type", "")

    if msg_type == "start_game":
        # Verify the player is the host
        if not room.players[player_id].is_host:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "game_start",
                "message": "Only the host can start the game"
            })
            return
        
        # Check if the game is already in progress
        if room.status != "waiting":
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "game_start",
                "message": "Game is already in progress"
            })
            return
        
        # Check if there are at least 2 players
        if len(room.players) < 2:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "game_start",
                "message": "At least 2 players are required to start the game"
            })
            return

        # Check if all players have roles
        players_without_roles = []
        for pid, player in room.players.items():
            if not player.role:
                players_without_roles.append(player.name)
        
        if players_without_roles:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "game_start",
                "message": f"Not all players have selected roles: {', '.join(players_without_roles)}"
            })
            return

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
        return
        
    elif msg_type == "puzzle_solution":
        # Validate puzzle solution
        puzzle = room.puzzles.get(player_id)
        if puzzle and validate_puzzle_solution(puzzle, message.get("solution")):
            # Mark puzzle as completed
            puzzle["completed"] = True

            # Notify all players
            await broadcast_to_room(
                room_code,
                {
                    "type": "puzzle_completed",
                    "player_id": player_id,
                    "role": room.players[player_id].role,
                },
            )

            # Check if stage is complete
            if all(
                p.get("completed", False)
                for p in room.puzzles.values()
                if p.get("type") != "team_puzzle"
            ):
                if "team" in room.puzzles and not room.puzzles["team"].get(
                    "completed", False
                ):
                    # Need to complete team puzzle
                    await broadcast_to_room(room_code, {"type": "team_puzzle_ready"})
                else:
                    # Advance to next stage
                    room.stage += 1
                    if room.stage > 5:
                        # Game completed!
                        room.status = "completed"
                        await broadcast_to_room(room_code, {"type": "game_completed"})
                    else:
                        # Set up next stage
                        room.puzzles = generate_puzzles(room, room.stage)
                        room.timer += 240  # Add 4 minutes per stage

                        await broadcast_to_room(
                            room_code,
                            {"type": "stage_completed", "next_stage": room.stage},
                        )

    elif msg_type == "use_power":
        # Handle role power usage
        role = room.players[player_id].role
        power_success = handle_power_usage(room, player_id, role)
        
        if power_success and role != "Lookout":
            # For Lookout, broadcasting is handled in handle_lookout_power
            # For other roles, broadcast power usage to all players
            player_name = room.players[player_id].name
            await broadcast_to_room(
                room_code, 
                {
                    "type": "power_used", 
                    "player_id": player_id, 
                    "player_name": player_name,
                    "role": role
                }
            )

    elif msg_type == "initiate_timer_vote":
        # Check if there's an active vote already
        if room.timer_vote_active:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "timer_vote",
                "message": "A timer extension vote is already in progress"
            })
            return
        
        # Initialize vote tracking
        room.timer_vote_active = True
        room.timer_votes = {"yes": [], "no": []}
        room.timer_vote_initiator = player_id
        
        # Broadcast vote initiated to all players
        await broadcast_to_room(
            room_code,
            {
                "type": "timer_vote_initiated",
                "initiator_id": player_id,
                "initiator_name": room.players[player_id].name,
                "vote_time_limit": room.timer_vote_time_limit,
                "votes": []  # No votes yet
            }
        )
        
        # Start timer for vote completion
        asyncio.create_task(run_vote_timer(room_code))
    
    elif msg_type == "extend_timer_vote":
        # Check if there's an active vote
        if not room.timer_vote_active:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "timer_vote",
                "message": "No timer extension vote is currently active"
            })
            return
        
        # Check if player already voted
        if player_id in room.timer_votes["yes"] or player_id in room.timer_votes["no"]:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "timer_vote",
                "message": "You have already voted"
            })
            return
        
        # Record the vote
        vote_type = "yes" if message.get("vote", True) else "no"
        room.timer_votes[vote_type].append(player_id)
        
        # Get all voters
        all_voters = room.timer_votes["yes"] + room.timer_votes["no"]
        
        # Broadcast vote update
        await broadcast_to_room(
            room_code,
            {
                "type": "timer_vote_update",
                "player_id": player_id,
                "vote": vote_type == "yes",
                "votes": all_voters
            }
        )
        
        # Check if everyone has voted
        connected_player_count = sum(1 for p in room.players.values() if p.connected)
        if len(all_voters) >= connected_player_count:
            # Everyone voted, process the result immediately
            await process_timer_vote_result(room_code)

    elif msg_type == "extend_timer":
        # Legacy method - deprecated in favor of voting system
        # This has been replaced by the timer vote system
        await connected_players[player_id].send_json({
            "type": "error",
            "context": "timer_extension",
            "message": "This method is deprecated. Please use the vote system instead."
        })

    elif msg_type == "chat_message":
        # Handle in-game chat
        if "message" in message:
            await broadcast_to_room(
                room_code,
                {
                    "type": "chat_message",
                    "player_id": player_id,
                    "player_name": room.players[player_id].name,
                    "message": message["message"],
                },
            )
    
    elif msg_type == "select_role":
        # Handle role selection
        role = message.get("role")
        if not role:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "role_selection",
                "message": "No role specified"
            })
            return
            
        # Check if role is already taken
        for p_id, player in room.players.items():
            if player.role == role and p_id != player_id:
                await connected_players[player_id].send_json({
                    "type": "error",
                    "context": "role_selection",
                    "message": "Role already taken"
                })
                return

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
                        "role": p.role,  # Show all roles
                        "connected": p.connected,
                        "is_host": p.is_host,
                    }
                    for pid, p in room.players.items()
                }
            }
        )


def validate_puzzle_solution(puzzle: Dict, solution) -> bool:
    """Validate a puzzle solution"""
    # In a real game, this would have more sophisticated validation
    puzzle_type = puzzle.get("type", "")

    # Example for circuit puzzle
    if puzzle_type == "circuit":
        return solution == puzzle["data"]["solution"]

    # Simple placeholder for other puzzle types
    return False


def handle_power_usage(room: GameRoom, player_id: str, role: str) -> bool:
    """Handle a role's power usage"""
    # In a real game, this would be more sophisticated
    if role == "Hacker":
        # Slow down timer
        room.timer += 30
        return True
    elif role == "Safe Cracker":
        # Skip one lock
        if player_id in room.puzzles:
            puzzle = room.puzzles[player_id]
            if "locks" in puzzle and puzzle["locks"] > 0:
                puzzle["locks"] -= 1
                return True
    elif role == "Demolitions":
        # Create shortcut
        room.shortcuts = room.shortcuts + 1 if hasattr(room, "shortcuts") else 1
        return True
    elif role == "Lookout":
        # Just set the flag, the async function will handle the rest
        room.next_events_visible = True
        
        # Schedule the async part of the Lookout power using the room code
        asyncio.create_task(handle_lookout_power(room_code=room.code, player_id=player_id))
        return True

    return False


async def handle_lookout_power(room_code: str, player_id: str):
    """Handle the async parts of the Lookout power"""
    if room_code not in game_rooms or player_id not in connected_players:
        return
        
    room = game_rooms[room_code]
    
    # Generate a future event prediction
    event_types = ["security_patrol", "camera_sweep", "system_check"]
    event_names = {
        "security_patrol": "Security Patrol",
        "camera_sweep": "Camera Sweep",
        "system_check": "System Check"
    }
    predicted_event = random.choice(event_types)
    predicted_time = random.randint(10, 30)
    display_name = event_names[predicted_event]
    
    # Send special notification only to the Lookout player if connected
    if player_id in connected_players:
        await connected_players[player_id].send_json({
            "type": "lookout_prediction",
            "event": predicted_event,
            "display_name": display_name,
            "predicted_time": predicted_time
        })
        
    # Create power description for other players
    power_description = "Enhanced Security Detection"
    
    # Add power description to broadcast
    await broadcast_to_room(
        room_code,
        {
            "type": "power_used",
            "player_id": player_id,
            "player_name": room.players[player_id].name,
            "role": "Lookout",
            "powerDescription": power_description
        }
    )
    
    # Set timeout to reset the ability after 60 seconds
    await reset_lookout_ability(room_code, 60)


async def run_vote_timer(room_code: str):
    """Run timer for vote completion"""
    room = game_rooms[room_code]
    
    # Wait for vote time limit
    time_remaining = room.timer_vote_time_limit
    
    while time_remaining > 0 and room.timer_vote_active:
        await asyncio.sleep(1)
        time_remaining -= 1
    
    # Process vote result when timer expires
    if room.timer_vote_active:
        await process_timer_vote_result(room_code)


async def process_timer_vote_result(room_code: str):
    """Process the timer vote result"""
    room = game_rooms[room_code]
    
    # Mark vote as inactive
    room.timer_vote_active = False
    
    # Calculate results
    yes_votes = len(room.timer_votes.get("yes", []))
    no_votes = len(room.timer_votes.get("no", []))
    all_votes = yes_votes + no_votes
    
    # Calculate required votes (majority of connected players)
    connected_player_count = sum(1 for p in room.players.values() if p.connected)
    required_votes = max(1, connected_player_count // 2 + 1)  # Majority
    
    # Determine success
    success = yes_votes >= required_votes
    
    if success:
        # Extend the timer
        room.timer += 60  # Add 1 minute
        room.alert_level += 1  # Increase alert level
        
        # Broadcast timer extended
        await broadcast_to_room(
            room_code,
            {
                "type": "timer_extended",
                "new_timer": room.timer,
                "alert_level": room.alert_level,
            },
        )
    
    # Broadcast vote completion to all players
    all_voters = room.timer_votes.get("yes", []) + room.timer_votes.get("no", [])
    
    await broadcast_to_room(
        room_code,
        {
            "type": "timer_vote_completed",
            "success": success,
            "votes": all_voters,
            "required_votes": required_votes,
            "message": "Timer extension vote failed" if not success else "Timer extended successfully"
        }
    )
    
    # Clean up vote data
    room.timer_votes = {"yes": [], "no": []}


async def reset_lookout_ability(room_code: str, delay_seconds: int):
    """Reset the Lookout's ability after a delay"""
    await asyncio.sleep(delay_seconds)
    
    if room_code in game_rooms:
        game_rooms[room_code].next_events_visible = False
