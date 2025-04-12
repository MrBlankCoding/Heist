import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any
from asyncio import Lock
from starlette.websockets import WebSocketState

from fastapi import WebSocket, WebSocketDisconnect, status
from dotenv import load_dotenv


# Import from app modules
from app.redis_client import (
    store_room_data,
    get_room_data,
    store_player_data,
    get_player_data,
    delete_player_data,
    delete_room_data,
    mark_player_connection_status,
    get_players_in_room,
    get_connected_players_in_room,
)

from app.utils import (
    store_connection,
    remove_connection,
    broadcast_to_room,
    get_environment_variable,
    connected_players,
)

from app.game_logic import (
    generate_puzzles,
    validate_puzzle_solution,
    handle_power_usage,
    run_game_timer,
    process_timer_vote_result,
    run_vote_timer,
    cleanup_if_no_players_connected,
)

from app.models import Player, GameRoom

# Load environment variables
load_dotenv()

# Connection limits and rate limiting
MAX_CONNECTIONS_PER_ROOM = int(
    get_environment_variable("MAX_CONNECTIONS_PER_ROOM", "10")
)
MAX_CONNECTIONS_PER_IP = int(get_environment_variable("MAX_CONNECTIONS_PER_IP", "20"))
CONNECTION_RATE_LIMIT = int(get_environment_variable("CONNECTION_RATE_LIMIT", "5"))

# Track connection data
connections_by_ip = defaultdict(int)
connections_by_room = defaultdict(int)
connection_times_by_ip = defaultdict(list)
connection_lock = Lock()


async def websocket_endpoint(websocket: WebSocket, room_code: str, player_id: str):
    client_ip = websocket.client.host

    # Check rate limiting and connection limits
    if not await check_connection_limits(websocket, client_ip, room_code):
        return

    try:
        await websocket.accept()

        # Get room data from Redis
        room_data = get_room_data(room_code)
        if not room_data:
            await websocket.send_json({"error": "Room not found"})
            await websocket.close()
            return

        # Convert to GameRoom object
        room = GameRoom(**room_data)

        # Check if player exists in the room
        if player_id not in room.players:
            await websocket.send_json({"error": "Player not found"})
            await websocket.close()
            return

        # Set up player connection
        player, was_connected = setup_player_connection(room, player_id, websocket)

        # Update room data
        store_room_data(room_code, room.dict())

        # Send initial state if player wasn't already connected
        if not was_connected:
            try:
                await send_initial_game_state(websocket, room, player_id)
                await broadcast_player_connected(room, player_id)
            except Exception as e:
                print(f"Error sending initial state to player {player_id}: {e}")

        # If game is in progress, send puzzle data
        if (
            room.status == "in_progress"
            and "puzzles" in room_data
            and player_id in room_data["puzzles"]
        ):
            try:
                await websocket.send_json(
                    {"type": "puzzle_data", "puzzle": room_data["puzzles"][player_id]}
                )
            except Exception as e:
                print(f"Error sending puzzle data to player {player_id}: {e}")

        # Main WebSocket message loop
        while True:
            try:
                data = await websocket.receive_text()
                try:
                    parsed_data = json.loads(data)
                    await process_websocket_message(room_code, player_id, parsed_data)
                except json.JSONDecodeError as e:
                    await websocket.send_json(
                        {"type": "error", "message": "Invalid message format"}
                    )
                except Exception as e:
                    print(f"Error processing message from player {player_id}: {e}")
            except WebSocketDisconnect:
                print(f"WebSocket disconnected for player {player_id}")
                await handle_player_disconnect(player_id, room_code)
                break
            except Exception as e:
                print(f"Error in WebSocket message loop for player {player_id}: {e}")
                # Let's try to continue the connection if possible
                await asyncio.sleep(0.5)
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    print(f"Client {player_id} disconnected during error handling")
                    await handle_player_disconnect(player_id, room_code)
                    break

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for player {player_id}")
        await handle_player_disconnect(player_id, room_code)

    except Exception as e:
        print(f"Unhandled exception in websocket_endpoint for player {player_id}: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass
        await handle_player_disconnect(player_id, room_code)

    finally:
        # Clean up connection tracking
        await cleanup_connection_tracking(client_ip, room_code)


async def check_connection_limits(
    websocket: WebSocket, client_ip: str, room_code: str
) -> bool:
    """Check if connection is within rate limits and max connections"""
    async with connection_lock:
        # Check connections per IP
        if connections_by_ip[client_ip] >= MAX_CONNECTIONS_PER_IP:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return False

        # Check connections per room
        if connections_by_room[room_code] >= MAX_CONNECTIONS_PER_ROOM:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return False

        # Check rate limiting
        current_time = asyncio.get_event_loop().time()
        # Remove old connection timestamps (older than 1 second)
        connection_times_by_ip[client_ip] = [
            t for t in connection_times_by_ip[client_ip] if current_time - t < 1.0
        ]

        # Check if too many connections in the last second
        if len(connection_times_by_ip[client_ip]) >= CONNECTION_RATE_LIMIT:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return False

        # Record this connection
        connection_times_by_ip[client_ip].append(current_time)
        connections_by_ip[client_ip] += 1
        connections_by_room[room_code] += 1

        return True


async def cleanup_connection_tracking(client_ip: str, room_code: str):
    """Clean up connection tracking data"""
    async with connection_lock:
        connections_by_ip[client_ip] -= 1
        connections_by_room[room_code] -= 1

        # Remove tracking data if zero connections
        if connections_by_ip[client_ip] <= 0:
            del connections_by_ip[client_ip]
            del connection_times_by_ip[client_ip]

        if connections_by_room[room_code] <= 0:
            del connections_by_room[room_code]


def setup_player_connection(
    room: GameRoom, player_id: str, websocket: WebSocket
) -> tuple:
    """Set up player connection and return player object and previous connection status"""
    # Store the WebSocket connection
    store_connection(player_id, websocket)

    # Get player and check if already connected
    if isinstance(room.players[player_id], dict):
        was_connected = room.players[player_id].get("connected", False)
        room.players[player_id]["connected"] = True
        player = Player(**room.players[player_id])
    else:
        was_connected = room.players[player_id].connected
        room.players[player_id].connected = True
        player = room.players[player_id]

    # Update connection status in Redis
    mark_player_connection_status(player_id, True)

    return player, was_connected


async def send_initial_game_state(websocket: WebSocket, room: GameRoom, player_id: str):
    """Send initial game state to the player"""
    # Prepare player data for sending
    all_players = {}
    for pid, p_data in room.players.items():
        if isinstance(p_data, dict):
            p = Player(**p_data)
        else:
            p = p_data

        all_players[pid] = {
            "id": pid,
            "name": p.name,
            "role": p.role,
            "connected": p.connected,
            "is_host": p.is_host,
        }

    # Send initial game state
    await websocket.send_json(
        {
            "type": "game_state",
            "room": room.code,
            "stage": room.stage,
            "status": room.status,
            "timer": room.timer,
            "alert_level": room.alert_level,
            "players": all_players,
        }
    )


async def broadcast_player_connected(room: GameRoom, player_id: str):
    """Broadcast player connected event to all players in the room"""
    player = room.players[player_id]
    player_data = {
        "id": player_id,
        "name": (
            player.name if hasattr(player, "name") else player.get("name", "Unknown")
        ),
        "role": player.role if hasattr(player, "role") else player.get("role", ""),
        "connected": True,
        "is_host": (
            player.is_host
            if hasattr(player, "is_host")
            else player.get("is_host", False)
        ),
    }

    await broadcast_to_room(
        room.code, {"type": "player_connected", "player": player_data}
    )


async def handle_player_disconnect(player_id: str, room_code: str):
    """Handle a player disconnecting from the game"""
    # Get updated room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return

    room = GameRoom(**room_data)

    # Mark player as disconnected
    if player_id in room.players:
        if isinstance(room.players[player_id], dict):
            room.players[player_id]["connected"] = False
        else:
            room.players[player_id].connected = False

        # Update Redis
        store_room_data(room_code, room.dict())

        # Update connection status in Redis
        mark_player_connection_status(player_id, False)

    # Remove the WebSocket connection
    remove_connection(player_id)

    # Notify other players
    await broadcast_to_room(
        room_code, {"type": "player_disconnected", "player_id": player_id}
    )

    # Get remaining connected players
    connected_players_info = get_connected_players_info(room)

    # If game is in progress and fewer than 2 players remain, end the game
    if room.status == "in_progress" and len(connected_players_info["players"]) < 2:
        await handle_game_ending_due_to_disconnection(
            room_code, room, connected_players_info
        )

    # Check if the game has ended and clean up if needed
    if room.status in ["completed", "failed"]:
        connected_players_count = len(get_connected_players_in_room(room_code))
        if connected_players_count == 0:
            await cleanup_finished_game(room_code)


def get_connected_players_info(room: GameRoom) -> dict:
    """Get information about connected players"""
    connected_count = 0
    player_names = []

    for pid, player in room.players.items():
        is_connected = False
        player_name = ""

        if isinstance(player, dict):
            is_connected = player.get("connected", False)
            player_name = player.get("name", "Unknown")
        else:
            is_connected = player.connected
            player_name = player.name

        if is_connected:
            connected_count += 1
            player_names.append(player_name)

    return {"count": connected_count, "players": player_names}


async def handle_game_ending_due_to_disconnection(
    room_code: str, room: GameRoom, connected_info: dict
):
    """Handle game ending due to insufficient players"""

    # Mark game as failed
    room.status = "failed"

    # Update Redis
    store_room_data(room_code, room.dict())

    # Create a descriptive message
    message = ""
    if connected_info["count"] == 0:
        message = "Game ended: All players have disconnected."
    elif connected_info["count"] == 1:
        message = (
            f"Game ended: Only one player ({connected_info['players'][0]}) remains."
        )
    else:
        message = f"Game ended: Not enough players remaining."

    # Notify remaining players that the game is ending
    await broadcast_to_room(
        room_code,
        {
            "type": "game_over",
            "result": "insufficient_players",
            "message": message,
            "remaining_players": connected_info["players"],
            "connected_count": connected_info["count"],
        },
    )

    # Schedule cleanup in case all players disconnect
    asyncio.create_task(cleanup_if_no_players_connected(room_code))


async def cleanup_finished_game(room_code: str):
    """Clean up resources for a finished game with no connected players"""

    # Clean up all player data for this room
    player_ids = get_players_in_room(room_code)
    for pid in player_ids:
        delete_player_data(pid)

    # Delete the room
    delete_room_data(room_code)


async def process_websocket_message(room_code: str, player_id: str, message: Dict):
    """Process websocket messages based on type"""
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        if message.get("type") != "join_room":
            return {"type": "error", "message": "Room not found"}
        else:
            # Handle join_room elsewhere
            pass

    # Convert to GameRoom object
    room = GameRoom(**room_data)

    message_type = message.get("type", "")

    handlers = {
        "start_game": handle_start_game,
        "select_role": handle_select_role,
        "leave_game": handle_leave_game,
        "reset_game": handle_reset_game,
        "chat_message": handle_chat_message,
        "puzzle_solution": handle_puzzle_solution,
        "use_power": handle_use_power,
        "initiate_timer_vote": handle_initiate_timer_vote,
        "extend_timer_vote": handle_extend_timer_vote,
        "team_puzzle_update": handle_team_puzzle_update,
        "complete_stage": handle_complete_stage,
        "sync_game_state": handle_sync_game_state,
        "game_started_acknowledgment": handle_game_started_acknowledgment,
    }

    if message_type in handlers:
        if message_type == "team_puzzle_update":
            await handlers[message_type](room_code, player_id, message)
        else:
            await handlers[message_type](room, room_code, player_id, message)
    elif message_type == "ping":
        # Handle ping by sending a pong response
        if player_id in connected_players:
            await connected_players[player_id].send_json(
                {"type": "pong", "timestamp": message.get("timestamp", 0)}
            )
    elif message_type == "request_puzzle" or message_type == "request_role_puzzles":
        # These are no longer needed as puzzles are generated client-side
        # Just acknowledge the request
        if player_id in connected_players:
            await connected_players[player_id].send_json(
                {
                    "type": "info",
                    "message": "Puzzles are now generated on the client side",
                }
            )
    else:
        # Unknown message type
        if player_id in connected_players:
            await connected_players[player_id].send_json(
                {"type": "error", "message": f"Unknown message type: {message_type}"}
            )


async def handle_game_started_acknowledgment(
    room: GameRoom, room_code: str, player_id: str, message: Dict = None
):
    """Handle game started acknowledgment from client"""
    # This is just to acknowledge that the client has started the game
    # We don't need to do anything special here since puzzles are now client-side
    if player_id in connected_players:
        await connected_players[player_id].send_json(
            {
                "type": "info",
                "message": "Game start acknowledged",
            }
        )

    # Add a debug log for monitoring
    print(
        f"Game start acknowledged by player {player_id}, role: {message.get('role', 'unknown')}"
    )


async def handle_start_game(
    room: GameRoom, room_code: str, player_id: str, message: Dict = None
):
    """Handle start game request"""
    # Verify the player is the host
    player_is_host = False
    if player_id in room.players:
        player = room.players[player_id]
        if isinstance(player, dict):
            player_is_host = player.get("is_host", False)
        else:
            player_is_host = player.is_host

    if not player_is_host:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "game_start",
                "message": "Only the host can start the game",
            }
        )
        return

    # Check if the game is already in progress
    if room.status != "waiting":
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "game_start",
                "message": "Game is already in progress",
            }
        )
        return
    """
        # Check if there are at least 2 players
    if len(room.players) < 2:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "game_start",
                "message": "At least 2 players are required to start the game",
            }
        )
        return
    """

    # Check if all players have roles
    players_without_roles = []
    for pid, player in room.players.items():
        if isinstance(player, dict):
            if not player.get("role"):
                players_without_roles.append(player.get("name", "Unknown"))
        else:
            if not player.role:
                players_without_roles.append(player.name)

    if players_without_roles:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "game_start",
                "message": f"Not all players have selected roles: {', '.join(players_without_roles)}",
            }
        )
        return

    # Initialize game state
    room.status = "in_progress"
    room.stage = 1
    room.alert_level = 0
    room.timer = 300  # 5 minutes

    # Initialize stage completion tracking for stage 1
    room.stage_completion = {"1": {}}

    # Initialize puzzles for stage 1
    room.puzzles = generate_puzzles(room, 1)

    # Update Redis
    store_room_data(room_code, room.dict())

    # Broadcast game start to all players
    await broadcast_to_room(
        room_code,
        {"type": "game_started", "stage": room.stage, "timer": room.timer},
    )

    # Send puzzle data to each player
    for pid, player_data in room.players.items():
        if pid in room.puzzles and pid in connected_players:
            await connected_players[pid].send_json(
                {"type": "puzzle_data", "puzzle": room.puzzles[pid]}
            )

    # Start the game timer
    asyncio.create_task(run_game_timer(room_code))


async def handle_puzzle_solution(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle player submitting puzzle solution"""
    # Check if this is a player puzzle or team puzzle
    if "puzzles" in room.dict() and player_id in room.puzzles:
        await handle_player_puzzle_solution(room, room_code, player_id, message)
    elif "puzzles" in room.dict() and "team" in room.puzzles:
        await handle_team_puzzle_solution(room, room_code, player_id, message)


async def handle_player_puzzle_solution(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle solution for individual player puzzle"""
    puzzle = room.puzzles[player_id]
    if not validate_puzzle_solution(puzzle, message.get("solution")):
        return

    # Mark puzzle as completed
    room.puzzles[player_id]["completed"] = True

    # Update stage completion tracking
    current_stage = str(room.stage)
    if current_stage not in room.stage_completion:
        room.stage_completion[current_stage] = {}
    room.stage_completion[current_stage][player_id] = True

    # Update Redis
    store_room_data(room_code, room.dict())

    # Get player role
    player_role = get_player_role(room, player_id)

    # Notify all players
    await broadcast_to_room(
        room_code,
        {
            "type": "puzzle_completed",
            "player_id": player_id,
            "role": player_role,
        },
    )

    # Notify the player who completed the puzzle
    await send_waiting_ui_data(room, room_code, player_id)

    # Check if stage is complete
    if all(
        p.get("completed", False)
        for p_id, p in room.puzzles.items()
        if p_id != "team" and isinstance(p, dict)
    ):
        if "team" in room.puzzles and not room.puzzles["team"].get("completed", False):
            # Need to complete team puzzle
            await broadcast_to_room(room_code, {"type": "team_puzzle_ready"})
        else:
            # Advance to next stage
            await advance_game_stage(room, room_code)


async def handle_team_puzzle_solution(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle solution for team puzzle"""
    team_puzzle = room.puzzles["team"]
    solution_data = message.get("solution", {})

    # Check if solution is in new format (with completesStage flag)
    is_stage_completion_puzzle = False
    if isinstance(solution_data, dict) and "completesStage" in solution_data:
        is_stage_completion_puzzle = solution_data.get("completesStage", False)
        solution_success = solution_data.get("success", False)
    else:
        # Legacy format - just a boolean value
        solution_success = solution_data

    if not solution_success:
        return

    # Mark team puzzle as completed
    room.puzzles["team"]["completed"] = True

    # Update Redis
    store_room_data(room_code, room.dict())

    # Get player role
    player_role = get_player_role(room, player_id)

    # Notify all players
    await broadcast_to_room(
        room_code,
        {
            "type": "puzzle_completed",
            "player_id": player_id,
            "role": player_role,
            "team_puzzle": True,
        },
    )

    # Notify the player who completed the team puzzle
    await send_waiting_ui_data(
        room,
        room_code,
        player_id,
        is_team_puzzle=True,
        completes_stage=is_stage_completion_puzzle
        or team_puzzle.get("completes_stage", False),
    )

    # If this is a special team puzzle that completes the stage directly
    if is_stage_completion_puzzle or team_puzzle.get("completes_stage", False):
        await advance_game_stage(room, room_code)
    # Otherwise check if we need to check for all player puzzles completed
    elif all(
        p.get("completed", False)
        for p_id, p in room.puzzles.items()
        if isinstance(p, dict)
    ):
        await advance_game_stage(room, room_code)


def get_player_role(room: GameRoom, player_id: str) -> str:
    """Get role of a player"""
    if player_id not in room.players:
        return ""

    player = room.players[player_id]
    if isinstance(player, dict):
        return player.get("role", "")
    else:
        return player.role


async def send_waiting_ui_data(
    room: GameRoom,
    room_code: str,
    player_id: str,
    is_team_puzzle=False,
    completes_stage=False,
):
    """Send waiting UI data to a player who completed their puzzle"""
    if player_id not in connected_players:
        return

    # Get stage completion status for all players
    completion_status = {}
    stage_str = str(room.stage)
    if stage_str in room.stage_completion:
        completion_status = room.stage_completion[stage_str]

    # Count completed players
    completed_players = len(completion_status)

    # Get total connected players
    connected_player_count = sum(
        1
        for pid, p in room.players.items()
        if (isinstance(p, dict) and p.get("connected", False))
        or (hasattr(p, "connected") and p.connected)
    )

    # Create message based on puzzle type
    message = (
        "Team puzzle completed! Waiting for stage transition..."
        if is_team_puzzle
        else "Puzzle completed! Waiting for other players to finish..."
    )

    # Send enhanced waiting UI data
    await connected_players[player_id].send_json(
        {
            "type": "player_waiting",
            "message": message,
            "current_stage": room.stage,
            "completed": True,
            "team_puzzle": is_team_puzzle,
            "completion_status": completion_status,
            "completed_count": completed_players,
            "total_players": connected_player_count,
            "stage_name": f"Stage {room.stage}",
            "completes_stage": completes_stage if is_team_puzzle else False,
        }
    )


async def advance_game_stage(room: GameRoom, room_code: str):
    """Advance the game to the next stage"""
    room.stage += 1
    if room.stage > 5:
        # Game completed!
        await complete_game(room, room_code)
    else:
        # Set up next stage
        room.puzzles = generate_puzzles(room, room.stage)
        room.timer += 240  # Add 4 minutes per stage

        # Reset stage completion tracking for the new stage
        new_stage = str(room.stage)
        room.stage_completion[new_stage] = {}

        # Update Redis
        store_room_data(room_code, room.dict())

        await broadcast_to_room(
            room_code, {"type": "stage_completed", "next_stage": room.stage}
        )

        # Send new puzzles to each player
        for pid in room.players:
            if pid in room.puzzles and pid in connected_players:
                await connected_players[pid].send_json(
                    {"type": "puzzle_data", "puzzle": room.puzzles[pid]}
                )


async def complete_game(room: GameRoom, room_code: str):
    """Handle game completion"""
    room.status = "completed"

    # Update Redis
    store_room_data(room_code, room.dict())

    await broadcast_to_room(room_code, {"type": "game_completed"})

    # Check if all players are disconnected to clean up the game
    asyncio.create_task(cleanup_if_no_players_connected(room_code))


async def handle_use_power(room: GameRoom, room_code: str, player_id: str):
    """Handle player using role power"""
    player_role = get_player_role(room, player_id)

    # Handle role power usage
    power_success = handle_power_usage(room, player_id, player_role)

    # Update Redis with modified room
    store_room_data(room_code, room.dict())

    if power_success and player_role != "Lookout":
        # For Lookout, broadcasting is handled in handle_lookout_power
        # For other roles, broadcast power usage to all players
        player_name = get_player_name(room, player_id)
        power_description = getattr(
            room, "last_power_description", f"{player_role} Power"
        )

        await broadcast_to_room(
            room_code,
            {
                "type": "power_used",
                "player_id": player_id,
                "player_name": player_name,
                "role": player_role,
                "powerDescription": power_description,
            },
        )


def get_player_name(room: GameRoom, player_id: str) -> str:
    """Get name of a player"""
    if player_id not in room.players:
        return "Unknown"

    player = room.players[player_id]
    if isinstance(player, dict):
        return player.get("name", "Unknown")
    else:
        return player.name


async def handle_initiate_timer_vote(room: GameRoom, room_code: str, player_id: str):
    """Handle initiating a timer extension vote"""
    # Check if there's an active vote already
    if hasattr(room, "timer_vote_active") and room.timer_vote_active:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "timer_vote",
                "message": "A timer extension vote is already in progress",
            }
        )
        return

    # Initialize vote tracking
    room.timer_vote_active = True
    room.timer_votes = {"yes": [], "no": []}
    room.timer_vote_initiator = player_id

    # Update Redis
    store_room_data(room_code, room.dict())

    # Get player name
    player_name = get_player_name(room, player_id)

    # Prepare connected players data
    connected_players_data = get_connected_players_data(room)

    # Broadcast vote initiated to all players
    await broadcast_to_room(
        room_code,
        {
            "type": "timer_vote_initiated",
            "initiator_id": player_id,
            "initiator_name": player_name,
            "vote_time_limit": getattr(room, "timer_vote_time_limit", 20),
            "votes": [],  # No votes yet
            "players": connected_players_data,
        },
    )

    # Start timer for vote completion
    asyncio.create_task(run_vote_timer(room_code))


def get_connected_players_data(room: GameRoom) -> dict:
    """Get data about connected players"""
    connected_players_data = {}
    for pid, player_data in room.players.items():
        if isinstance(player_data, dict):
            if player_data.get("connected", False):
                connected_players_data[pid] = {
                    "id": pid,
                    "name": player_data.get("name", "Unknown"),
                    "role": player_data.get("role", ""),
                    "connected": True,
                }
        else:
            if player_data.connected:
                connected_players_data[pid] = {
                    "id": pid,
                    "name": player_data.name,
                    "role": player_data.role,
                    "connected": True,
                }
    return connected_players_data


async def handle_extend_timer_vote(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle player voting on timer extension"""
    # Check if there's an active vote
    if not hasattr(room, "timer_vote_active") or not room.timer_vote_active:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "timer_vote",
                "message": "No timer extension vote is currently active",
            }
        )
        return

    # Get current votes
    if not hasattr(room, "timer_votes") or not isinstance(room.timer_votes, dict):
        room.timer_votes = {"yes": [], "no": []}

    yes_votes = room.timer_votes.get("yes", [])
    no_votes = room.timer_votes.get("no", [])

    # Check if player already voted
    if player_id in yes_votes or player_id in no_votes:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "timer_vote",
                "message": "You have already voted",
            }
        )
        return

    # Record the vote
    vote_type = "yes" if message.get("vote", True) else "no"
    if vote_type == "yes":
        yes_votes.append(player_id)
        room.timer_votes["yes"] = yes_votes
    else:
        no_votes.append(player_id)
        room.timer_votes["no"] = no_votes

    # Update Redis
    store_room_data(room_code, room.dict())

    # Get all voters
    all_voters = yes_votes + no_votes

    # Prepare connected players data
    connected_players_data = get_connected_players_data(room)

    # Broadcast vote update
    await broadcast_to_room(
        room_code,
        {
            "type": "timer_vote_update",
            "player_id": player_id,
            "vote": vote_type == "yes",
            "votes": all_voters,
            "players": connected_players_data,
        },
    )

    # Check if everyone has voted
    connected_player_count = sum(
        1
        for pid, p in room.players.items()
        if (isinstance(p, dict) and p.get("connected", False))
        or (hasattr(p, "connected") and p.connected)
    )

    if len(all_voters) >= connected_player_count:
        # Everyone voted, process the result immediately
        await process_timer_vote_result(room_code)


async def handle_chat_message(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle in-game chat messages"""
    if "message" not in message:
        return

    # Get player name
    player_name = get_player_name(room, player_id)

    await broadcast_to_room(
        room_code,
        {
            "type": "chat_message",
            "player_id": player_id,
            "player_name": player_name,
            "message": message["message"],
        },
    )


async def handle_select_role(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle player selecting a role"""
    role = message.get("role")
    if not role:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "role_selection",
                "message": "No role specified",
            }
        )
        return

    # Check if role is already taken
    for p_id, player_data in room.players.items():
        player_role = ""
        if isinstance(player_data, dict):
            player_role = player_data.get("role", "")
        else:
            player_role = player_data.role

        if player_role == role and p_id != player_id:
            await connected_players[player_id].send_json(
                {
                    "type": "error",
                    "context": "role_selection",
                    "message": "Role already taken",
                }
            )
            return

    # Assign role to player in room
    if player_id in room.players:
        if isinstance(room.players[player_id], dict):
            room.players[player_id]["role"] = role
        else:
            room.players[player_id].role = role

    # Update Redis
    store_room_data(room_code, room.dict())

    # Update player data
    player_data = get_player_data(player_id)
    if player_data:
        player_data["role"] = role
        store_player_data(player_id, player_data)

    # Get player info for response
    player_name = get_player_name(room, player_id)
    player_connected = True
    player_is_host = False

    if player_id in room.players:
        player = room.players[player_id]
        if isinstance(player, dict):
            player_connected = player.get("connected", True)
            player_is_host = player.get("is_host", False)
        else:
            player_connected = player.connected
            player_is_host = player.is_host

    # Prepare player data for response
    player_data = {
        "id": player_id,
        "name": player_name,
        "role": role,
        "connected": player_connected,
        "is_host": player_is_host,
    }

    # Prepare all players data
    all_players = {}
    for pid, p_data in room.players.items():
        if isinstance(p_data, dict):
            all_players[pid] = {
                "id": pid,
                "name": p_data.get("name", "Unknown"),
                "role": p_data.get("role", ""),
                "connected": p_data.get("connected", True),
                "is_host": p_data.get("is_host", False),
            }
        else:
            all_players[pid] = {
                "id": pid,
                "name": p_data.name,
                "role": p_data.role,
                "connected": p_data.connected,
                "is_host": p_data.is_host,
            }

    # Broadcast role confirmation to all players
    await broadcast_to_room(
        room_code,
        {
            "type": "role_confirmed",
            "player_id": player_id,
            "role": role,
            "player": player_data,
            "players": all_players,
        },
    )


async def handle_leave_game(room: GameRoom, room_code: str, player_id: str):
    """Handle player intentionally leaving the game"""

    # Get player name before removing
    player_name = get_player_name(room, player_id)

    # Remove player from the room
    if player_id in room.players:
        del room.players[player_id]

        # Update Redis
        store_room_data(room_code, room.dict())

    # Remove player's connection
    remove_connection(player_id)

    # Clean up player data in Redis
    delete_player_data(player_id)

    # Notify other players about the player leaving
    await broadcast_to_room(
        room_code,
        {
            "type": "player_left",
            "player_id": player_id,
            "player_name": player_name,
            "message": f"{player_name} has left the game",
        },
    )

    # Get remaining players information
    connected_players_info = get_connected_players_info(room)

    # If game is in progress and fewer than 2 players remain, end the game
    if room.status == "in_progress" and len(connected_players_info["players"]) < 2:
        await handle_game_ending_due_to_disconnection(
            room_code, room, connected_players_info
        )

    # If room is now empty, clean it up
    if not room.players:
        delete_room_data(room_code)
        await cleanup_finished_game(room_code)


async def handle_reset_game(
    room: GameRoom, room_code: str, player_id: str, message: Dict = None
):
    """Handle reset game request"""
    # Verify the player is the host
    player_is_host = False
    if player_id in room.players:
        player = room.players[player_id]
        if isinstance(player, dict):
            player_is_host = player.get("is_host", False)
        else:
            player_is_host = player.is_host

    if not player_is_host:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "reset_game",
                "message": "Only the host can reset the game",
            }
        )
        return

    # Reset the game state
    room.status = "waiting"
    room.stage = 1
    room.timer = 300  # Default timer (5 minutes)
    room.alert_level = 0

    # Clear puzzle data
    room.puzzles = {}
    if hasattr(room, "stage_completion"):
        room.stage_completion = {}

    # Update Redis
    store_room_data(room_code, room.dict())

    # Broadcast reset to all players
    await broadcast_to_room(
        room_code,
        {
            "type": "game_reset",
            "message": "Game has been reset by the host",
        },
    )


async def handle_sync_game_state(
    room: GameRoom, room_code: str, player_id: str, message: Dict = None
):
    """Handle game state synchronization request"""
    if player_id not in connected_players:
        return

    # Prepare game state data to send back
    game_state = {
        "status": room.status,
        "stage": room.stage,
        "timer": room.timer,
        "alert_level": room.alert_level,
        "players": {},
    }

    # Add player data
    for pid, player in room.players.items():
        if isinstance(player, dict):
            game_state["players"][pid] = player
        else:
            game_state["players"][pid] = player.dict()

    # Add stage completion data if available
    if hasattr(room, "stage_completion"):
        game_state["stage_completion"] = room.stage_completion

    # Send synchronized state
    await connected_players[player_id].send_json(
        {"type": "game_state_sync", "game_state": game_state}
    )


async def handle_team_puzzle_update(room_code: str, player_id: str, message: Dict):
    """Handle real-time updates for collaborative team puzzles"""
    if "update_data" in message:
        # Extract update data
        update_data = message.get("update_data", {})
        puzzle_type = update_data.get("puzzle_type", "")

        # Broadcast the update to all players except the sender
        await broadcast_to_room(
            room_code,
            {
                "type": "team_puzzle_update",
                "player_id": player_id,
                "puzzle_type": puzzle_type,
                "update_data": update_data,
            },
            exclude_player_id=player_id,  # Don't send back to the original sender
        )


async def handle_complete_stage(
    room: GameRoom, room_code: str, player_id: str, message: Dict
):
    """Handle host request to complete stage"""
    # Verify the player is the host
    player_is_host = False
    if player_id in room.players:
        player = room.players[player_id]
        if isinstance(player, dict):
            player_is_host = player.get("is_host", False)
        else:
            player_is_host = player.is_host

    if not player_is_host:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "complete_stage",
                "message": "Only the host can complete the stage",
            }
        )
        return

    # Get the current stage from the message
    current_stage = message.get("data", {}).get("currentStage", 0)

    # Verify the provided stage matches the current room stage
    if current_stage != room.stage:
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "complete_stage",
                "message": "Stage mismatch",
            }
        )
        return

    # Use the existing advance_game_stage function to handle stage progression
    await advance_game_stage(room, room_code)
