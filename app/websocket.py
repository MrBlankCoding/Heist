from fastapi import WebSocket, WebSocketDisconnect, status
import json
import asyncio
import logging
import os
from typing import Dict, Set, Optional
from collections import defaultdict
from asyncio import Lock
from dotenv import load_dotenv

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
    delete_player_data,
    delete_room_data,
    mark_player_connection_status,
    get_players_in_room,
    get_connected_players_in_room,
    SUCCESS,
    FAILURE,
)

# Import utils
from app.utils import (
    store_connection,
    get_connection,
    remove_connection,
    broadcast_to_room,
    get_environment_variable,
    get_boolean_env,
    connected_players,
    game_rooms,  # For compatibility only
)

# Import functions from game_logic
from app.game_logic import (
    generate_puzzles,
    validate_puzzle_solution,
    handle_power_usage,
    run_game_timer,
    process_timer_vote_result,
    run_vote_timer,
)

# Import models
from app.models import Player, GameRoom

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.websocket")

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
    async with connection_lock:
        # Check connections per IP
        if connections_by_ip[client_ip] >= MAX_CONNECTIONS_PER_IP:
            logger.warning(f"Connection limit exceeded for IP {client_ip}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Check connections per room
        if connections_by_room[room_code] >= MAX_CONNECTIONS_PER_ROOM:
            logger.warning(f"Connection limit exceeded for room {room_code}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Check rate limiting
        current_time = asyncio.get_event_loop().time()
        # Remove old connection timestamps (older than 1 second)
        connection_times_by_ip[client_ip] = [
            t for t in connection_times_by_ip[client_ip] if current_time - t < 1.0
        ]

        # Check if too many connections in the last second
        if len(connection_times_by_ip[client_ip]) >= CONNECTION_RATE_LIMIT:
            logger.warning(f"Rate limit exceeded for IP {client_ip}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Record this connection
        connection_times_by_ip[client_ip].append(current_time)
        connections_by_ip[client_ip] += 1
        connections_by_room[room_code] += 1

    try:
        await websocket.accept()

        # Get room data from Redis
        room_data = get_room_data(room_code)
        if not room_data:
            logger.warning(f"Room {room_code} not found for player {player_id}")
            await websocket.send_json({"error": "Room not found"})
            await websocket.close()
            return

        # Convert to GameRoom object
        room = GameRoom(**room_data)

        # Check if player exists in the room
        if player_id not in room.players:
            logger.warning(f"Player {player_id} not found in room {room_code}")
            await websocket.send_json({"error": "Player not found"})
            await websocket.close()
            return

        # Store the WebSocket connection
        store_connection(player_id, websocket)
        logger.info(f"Player {player_id} connected to room {room_code}")

        # Mark player as connected
        player_connected_before = False
        if isinstance(room.players[player_id], dict):
            player_connected_before = room.players[player_id].get("connected", False)
            room.players[player_id]["connected"] = True
            player = Player(**room.players[player_id])
        else:
            player_connected_before = room.players[player_id].connected
            room.players[player_id].connected = True
            player = room.players[player_id]

        # Update connection status in Redis
        mark_player_connection_status(player_id, True)

        # Update room data in Redis
        store_room_data(room_code, room.dict())

        # Also update in-memory GameRoom for compatibility
        if room_code in game_rooms:
            if player_id in game_rooms[room_code].players:
                game_rooms[room_code].players[player_id].connected = True
        else:
            game_rooms[room_code] = room

        # Send initial game state only if this player wasn't already connected
        if not player_connected_before:
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

            # Send initial game state to the new player
            await websocket.send_json(
                {
                    "type": "game_state",
                    "room": room_code,
                    "stage": room.stage,
                    "status": room.status,
                    "timer": room.timer,
                    "alert_level": room.alert_level,
                    "players": all_players,
                }
            )

            # Broadcast player connected to all other players
            await broadcast_to_room(
                room_code,
                {
                    "type": "player_connected",
                    "player": {
                        "id": player_id,
                        "name": player.name,
                        "role": player.role,
                        "connected": True,
                        "is_host": player.is_host,
                    },
                },
            )

        # If game is in progress, send puzzle data
        if room.status == "in_progress":
            if "puzzles" in room_data and player_id in room_data["puzzles"]:
                await websocket.send_json(
                    {"type": "puzzle_data", "puzzle": room_data["puzzles"][player_id]}
                )

        try:
            # Main WebSocket message loop
            while True:
                data = await websocket.receive_text()
                try:
                    # Parse the message as JSON
                    parsed_data = json.loads(data)
                    await process_websocket_message(room_code, player_id, parsed_data)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON from player {player_id}: {e}")
                    await websocket.send_json(
                        {"type": "error", "message": "Invalid message format"}
                    )

        except WebSocketDisconnect:
            # Handle disconnect
            logger.info(f"Player {player_id} disconnected from room {room_code}")
            await handle_player_disconnect(player_id, room_code)

    except Exception as e:
        logger.error(f"Error in websocket connection: {e}", exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            # Already closed or other error
            pass

    finally:
        # Clean up connection tracking
        async with connection_lock:
            connections_by_ip[client_ip] -= 1
            connections_by_room[room_code] -= 1

            # Remove tracking data if zero connections
            if connections_by_ip[client_ip] <= 0:
                del connections_by_ip[client_ip]
                del connection_times_by_ip[client_ip]

            if connections_by_room[room_code] <= 0:
                del connections_by_room[room_code]


async def handle_player_disconnect(player_id: str, room_code: str):
    """Handle a player disconnecting from the game"""
    # Get updated room data from Redis
    room_data = get_room_data(room_code)
    if room_data:
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
    
    # Also update in-memory room for compatibility
    if room_code in game_rooms and player_id in game_rooms[room_code].players:
        game_rooms[room_code].players[player_id].connected = False
        
    # Remove the WebSocket connection
    remove_connection(player_id)

    # Notify other players
    await broadcast_to_room(
        room_code, {"type": "player_disconnected", "player_id": player_id}
    )
    
    # Count remaining connected players
    connected_count = 0
    player_names = []
    if room_data:
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
    
        # If game is in progress and fewer than 2 players remain, end the game
        if room.status == "in_progress" and connected_count < 2:
            logger.info(f"Game {room_code} ending due to insufficient players: {connected_count} remaining")
            
            # Mark game as failed
            room.status = "failed"
            
            # Update Redis
            store_room_data(room_code, room.dict())
            
            # Update in-memory for compatibility
            if room_code in game_rooms:
                game_rooms[room_code].status = "failed"
                
            # Create a more descriptive message
            message = ""
            if connected_count == 0:
                message = "Game ended: All players have disconnected."
            elif connected_count == 1:
                message = f"Game ended: Only one player ({player_names[0]}) remains."
            else:
                message = f"Game ended: Not enough players remaining."
                
            # Notify remaining players that the game is ending
            await broadcast_to_room(
                room_code, 
                {
                    "type": "game_over", 
                    "result": "insufficient_players",
                    "message": message,
                    "remaining_players": player_names,
                    "connected_count": connected_count
                }
            )
            
            # Schedule cleanup in case all players disconnect
            asyncio.create_task(app.game_logic.cleanup_if_no_players_connected(room_code))
    
    # Check if the game has ended and clean up if needed
    if room_data:
        game_status = room_data.get("status", "")
        if game_status in ["completed", "failed"]:
            # Check if all players are now disconnected
            connected_players = get_connected_players_in_room(room_code)
            if not connected_players or (len(connected_players) == 0):
                # All players disconnected and game is over, clean up
                logger.info(
                    f"All players disconnected from finished game {room_code}, cleaning up"
                )
                
                # Clean up all player data for this room
                player_ids = get_players_in_room(room_code)
                for pid in player_ids:
                    delete_player_data(pid)
                
                # Delete the room
                delete_room_data(room_code)
                
                # Remove from in-memory storage
                if room_code in game_rooms:
                    del game_rooms[room_code]


async def process_websocket_message(room_code: str, player_id: str, message: Dict):
    """Process a message from a WebSocket client"""
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        if player_id in connected_players:
            await connected_players[player_id].send_json({"error": "Room not found"})
        return

    # Convert to GameRoom object
    room = GameRoom(**room_data)

    # Determine message type
    msg_type = message.get("type", "")
    action_type = None

    # Handle action messages
    if msg_type == "action":
        action_type = message.get("action", "")

    # Process based on message type and action type
    if msg_type == "start_game":
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

        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code] = room

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
                print(f"Sent puzzle to player {pid}")

        # Start the game timer
        asyncio.create_task(run_game_timer(room_code))
        return

    elif msg_type == "puzzle_solution":
        # Validate puzzle solution
        if "puzzles" in room_data and player_id in room_data["puzzles"]:
            puzzle = room_data["puzzles"][player_id]
            if validate_puzzle_solution(puzzle, message.get("solution")):
                # Mark puzzle as completed
                room_data["puzzles"][player_id]["completed"] = True
                room.puzzles = room_data["puzzles"]

                # Update stage completion tracking
                current_stage = str(room.stage)
                if current_stage not in room.stage_completion:
                    room.stage_completion[current_stage] = {}
                room.stage_completion[current_stage][player_id] = True

                # Update Redis
                store_room_data(room_code, room.dict())

                # Update in-memory for compatibility
                if room_code in game_rooms:
                    game_rooms[room_code].puzzles = room.puzzles
                    game_rooms[room_code].stage_completion = room.stage_completion

                # Get player role
                player_role = ""
                if player_id in room.players:
                    player = room.players[player_id]
                    if isinstance(player, dict):
                        player_role = player.get("role", "")
                    else:
                        player_role = player.role

                # Notify all players
                await broadcast_to_room(
                    room_code,
                    {
                        "type": "puzzle_completed",
                        "player_id": player_id,
                        "role": player_role,
                    },
                )
                
                # Notify the player who completed the puzzle to show waiting UI
                if player_id in connected_players:
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
                    
                    # Send enhanced waiting UI data
                    await connected_players[player_id].send_json(
                        {
                            "type": "player_waiting",
                            "message": "Puzzle completed! Waiting for other players to finish...",
                            "current_stage": room.stage,
                            "completed": True,
                            "completion_status": completion_status,
                            "completed_count": completed_players,
                            "total_players": connected_player_count,
                            "stage_name": f"Stage {room.stage}"
                        }
                    )

                # Check if stage is complete
                if all(
                    p.get("completed", False)
                    for p_id, p in room.puzzles.items()
                    if p_id != "team" and isinstance(p, dict)
                ):
                    if "team" in room.puzzles and not room.puzzles["team"].get(
                        "completed", False
                    ):
                        # Need to complete team puzzle
                        await broadcast_to_room(
                            room_code, {"type": "team_puzzle_ready"}
                        )
                    else:
                        # Advance to next stage
                        room.stage += 1
                        if room.stage > 5:
                            # Game completed!
                            room.status = "completed"

                            # Update Redis
                            store_room_data(room_code, room.dict())

                            # Update in-memory
                            if room_code in game_rooms:
                                game_rooms[room_code].status = "completed"
                                game_rooms[room_code].stage = room.stage

                            await broadcast_to_room(
                                room_code, {"type": "game_completed"}
                            )

                            # Check if all players are disconnected to clean up the game
                            # Use asyncio to run the cleanup check after a delay
                            asyncio.create_task(
                                app.game_logic.cleanup_if_no_players_connected(
                                    room_code
                                )
                            )
                        else:
                            # Set up next stage
                            room.puzzles = generate_puzzles(room, room.stage)
                            room.timer += 240  # Add 4 minutes per stage

                            # Reset stage completion tracking for the new stage
                            new_stage = str(room.stage)
                            room.stage_completion[new_stage] = {}

                            # Update Redis
                            store_room_data(room_code, room.dict())

                            # Update in-memory
                            if room_code in game_rooms:
                                game_rooms[room_code].puzzles = room.puzzles
                                game_rooms[room_code].timer = room.timer
                                game_rooms[room_code].stage = room.stage
                                game_rooms[
                                    room_code
                                ].stage_completion = room.stage_completion

                            await broadcast_to_room(
                                room_code,
                                {"type": "stage_completed", "next_stage": room.stage},
                            )
                            
                            # Send new puzzles to each player
                            for pid, player_data in room.players.items():
                                if pid in room.puzzles and pid in connected_players:
                                    await connected_players[pid].send_json(
                                        {"type": "puzzle_data", "puzzle": room.puzzles[pid]}
                                    )
        # Handle team puzzle solution
        elif "puzzles" in room_data and "team" in room_data["puzzles"]:
            team_puzzle = room_data["puzzles"]["team"]
            solution_data = message.get("solution", {})

            # Check if solution is in new format (with completesStage flag)
            is_stage_completion_puzzle = False
            if isinstance(solution_data, dict) and "completesStage" in solution_data:
                is_stage_completion_puzzle = solution_data.get("completesStage", False)
                solution_success = solution_data.get("success", False)
            else:
                # Legacy format - just a boolean value
                solution_success = solution_data

            if solution_success:
                # Mark team puzzle as completed
                room_data["puzzles"]["team"]["completed"] = True
                room.puzzles = room_data["puzzles"]

                # Update Redis
                store_room_data(room_code, room.dict())

                # Update in-memory for compatibility
                if room_code in game_rooms:
                    game_rooms[room_code].puzzles = room.puzzles

                # Get player role
                player_role = ""
                if player_id in room.players:
                    player = room.players[player_id]
                    if isinstance(player, dict):
                        player_role = player.get("role", "")
                    else:
                        player_role = player.role

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
                
                # Notify the player who completed the team puzzle to show waiting UI
                if player_id in connected_players:
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
                    
                    # Send enhanced waiting UI data
                    await connected_players[player_id].send_json(
                        {
                            "type": "player_waiting",
                            "message": "Team puzzle completed! Waiting for stage transition...",
                            "current_stage": room.stage,
                            "completed": True,
                            "team_puzzle": True,
                            "completion_status": completion_status,
                            "completed_count": completed_players,
                            "total_players": connected_player_count,
                            "stage_name": f"Stage {room.stage}",
                            "completes_stage": is_stage_completion_puzzle or team_puzzle.get("completes_stage", False)
                        }
                    )

                # If this is a special team puzzle that completes the stage directly
                if is_stage_completion_puzzle or team_puzzle.get(
                    "completes_stage", False
                ):
                    # Advance to next stage
                    room.stage += 1
                    if room.stage > 5:
                        # Game completed!
                        room.status = "completed"

                        # Update Redis
                        store_room_data(room_code, room.dict())

                        # Update in-memory
                        if room_code in game_rooms:
                            game_rooms[room_code].status = "completed"
                            game_rooms[room_code].stage = room.stage

                        await broadcast_to_room(room_code, {"type": "game_completed"})

                        # Check if all players are disconnected to clean up the game
                        # Use asyncio to run the cleanup check after a delay
                        asyncio.create_task(
                            app.game_logic.cleanup_if_no_players_connected(room_code)
                        )
                    else:
                        # Set up next stage
                        room.puzzles = generate_puzzles(room, room.stage)
                        room.timer += 240  # Add 4 minutes per stage

                        # Reset stage completion tracking for the new stage
                        new_stage = str(room.stage)
                        room.stage_completion[new_stage] = {}

                        # Update Redis
                        store_room_data(room_code, room.dict())

                        # Update in-memory
                        if room_code in game_rooms:
                            game_rooms[room_code].puzzles = room.puzzles
                            game_rooms[room_code].timer = room.timer
                            game_rooms[room_code].stage = room.stage
                            game_rooms[
                                room_code
                            ].stage_completion = room.stage_completion

                        await broadcast_to_room(
                            room_code,
                            {"type": "stage_completed", "next_stage": room.stage},
                        )
                        
                        # Send new puzzles to each player
                        for pid, player_data in room.players.items():
                            if pid in room.puzzles and pid in connected_players:
                                await connected_players[pid].send_json(
                                    {"type": "puzzle_data", "puzzle": room.puzzles[pid]}
                                )
                # Otherwise check if we need to check for all player puzzles completed
                elif all(
                    p.get("completed", False)
                    for p_id, p in room.puzzles.items()
                    if isinstance(p, dict)
                ):
                    # All puzzles completed, advance to next stage
                    room.stage += 1
                    if room.stage > 5:
                        # Game completed!
                        room.status = "completed"

                        # Update Redis
                        store_room_data(room_code, room.dict())

                        # Update in-memory
                        if room_code in game_rooms:
                            game_rooms[room_code].status = "completed"
                            game_rooms[room_code].stage = room.stage

                        await broadcast_to_room(room_code, {"type": "game_completed"})

                        # Check if all players are disconnected to clean up the game
                        # Use asyncio to run the cleanup check after a delay
                        asyncio.create_task(
                            app.game_logic.cleanup_if_no_players_connected(room_code)
                        )
                    else:
                        # Set up next stage
                        room.puzzles = generate_puzzles(room, room.stage)
                        room.timer += 240  # Add 4 minutes per stage

                        # Reset stage completion tracking for the new stage
                        new_stage = str(room.stage)
                        room.stage_completion[new_stage] = {}

                        # Update Redis
                        store_room_data(room_code, room.dict())

                        # Update in-memory
                        if room_code in game_rooms:
                            game_rooms[room_code].puzzles = room.puzzles
                            game_rooms[room_code].timer = room.timer
                            game_rooms[room_code].stage = room.stage
                            game_rooms[
                                room_code
                            ].stage_completion = room.stage_completion

                        await broadcast_to_room(
                            room_code,
                            {"type": "stage_completed", "next_stage": room.stage},
                        )

                        # Send new puzzles to each player
                        for pid, player_data in room.players.items():
                            if pid in room.puzzles and pid in connected_players:
                                await connected_players[pid].send_json(
                                    {"type": "puzzle_data", "puzzle": room.puzzles[pid]}
                                )

    elif msg_type == "use_power":
        # Get player role
        player_role = ""
        if player_id in room.players:
            player = room.players[player_id]
            if isinstance(player, dict):
                player_role = player.get("role", "")
            else:
                player_role = player.role

        # Handle role power usage
        power_success = handle_power_usage(room, player_id, player_role)

        # Update Redis with modified room
        store_room_data(room_code, room.dict())

        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code] = room

        if power_success and player_role != "Lookout":
            # For Lookout, broadcasting is handled in handle_lookout_power
            # For other roles, broadcast power usage to all players
            player_name = ""
            if player_id in room.players:
                player = room.players[player_id]
                if isinstance(player, dict):
                    player_name = player.get("name", "Unknown")
                else:
                    player_name = player.name

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

    elif msg_type == "initiate_timer_vote":
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

        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].timer_vote_active = True
            game_rooms[room_code].timer_votes = {"yes": [], "no": []}
            game_rooms[room_code].timer_vote_initiator = player_id

        # Get player name
        player_name = ""
        if player_id in room.players:
            player = room.players[player_id]
            if isinstance(player, dict):
                player_name = player.get("name", "Unknown")
            else:
                player_name = player.name

        # Prepare connected players data
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

    elif msg_type == "extend_timer_vote":
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

        # Update in-memory for compatibility
        if room_code in game_rooms:
            if vote_type == "yes":
                game_rooms[room_code].timer_votes["yes"].append(player_id)
            else:
                game_rooms[room_code].timer_votes["no"].append(player_id)

        # Get all voters
        all_voters = yes_votes + no_votes

        # Prepare connected players data
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

    elif msg_type == "extend_timer":
        # Legacy method - deprecated in favor of voting system
        # This has been replaced by the timer vote system
        await connected_players[player_id].send_json(
            {
                "type": "error",
                "context": "timer_extension",
                "message": "This method is deprecated. Please use the vote system instead.",
            }
        )

    elif msg_type == "chat_message":
        # Handle in-game chat
        if "message" in message:
            # Get player name
            player_name = ""
            if player_id in room.players:
                player = room.players[player_id]
                if isinstance(player, dict):
                    player_name = player.get("name", "Unknown")
                else:
                    player_name = player.name

            await broadcast_to_room(
                room_code,
                {
                    "type": "chat_message",
                    "player_id": player_id,
                    "player_name": player_name,
                    "message": message["message"],
                },
            )

    elif msg_type == "select_role":
        # Handle role selection
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

        # Update in-memory for compatibility
        if room_code in game_rooms and player_id in game_rooms[room_code].players:
            game_rooms[room_code].players[player_id].role = role

        # Get player info for response
        player_name = ""
        player_connected = True
        player_is_host = False

        if player_id in room.players:
            player = room.players[player_id]
            if isinstance(player, dict):
                player_name = player.get("name", "Unknown")
                player_connected = player.get("connected", True)
                player_is_host = player.get("is_host", False)
            else:
                player_name = player.name
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

    elif msg_type == "request_puzzle":
        # Check if the game is in progress
        if room.status != "in_progress":
            await connected_players[player_id].send_json(
                {
                    "type": "error",
                    "context": "puzzle_request",
                    "message": "Game is not in progress",
                }
            )
            return

        # Check if puzzle exists for this player
        if player_id in room.puzzles:
            print(f"Sending requested puzzle to player {player_id}")
            await connected_players[player_id].send_json(
                {"type": "puzzle_data", "puzzle": room.puzzles[player_id]}
            )
        else:
            print(f"No puzzle found for player {player_id}, generating new puzzle")
            # Determine player role
            role = ""
            if player_id in room.players:
                player = room.players[player_id]
                if isinstance(player, dict):
                    role = player.get("role", "")
                else:
                    role = player.role

            # Generate a puzzle based on role
            from app.game_logic import (
                generate_hacker_puzzle,
                generate_safe_cracker_puzzle,
                generate_demolitions_puzzle,
                generate_lookout_puzzle,
            )

            if role == "Hacker":
                room.puzzles[player_id] = generate_hacker_puzzle(room.stage)
            elif role == "Safe Cracker":
                room.puzzles[player_id] = generate_safe_cracker_puzzle(room.stage)
            elif role == "Demolitions":
                room.puzzles[player_id] = generate_demolitions_puzzle(room.stage)
            elif role == "Lookout":
                room.puzzles[player_id] = generate_lookout_puzzle(room.stage)
            else:
                await connected_players[player_id].send_json(
                    {
                        "type": "error",
                        "context": "puzzle_request",
                        "message": f"Unknown role: {role}",
                    }
                )
                return

            # Update Redis
            store_room_data(room_code, room.dict())

            # Send the newly generated puzzle
            await connected_players[player_id].send_json(
                {"type": "puzzle_data", "puzzle": room.puzzles[player_id]}
            )

    elif msg_type == "team_puzzle_update":
        # This handles real-time updates for collaborative team puzzles
        if "room_code" in message and "update_data" in message:
            # Simply relay the update to all other players in the room
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
            return

    elif msg_type == "action" and action_type == "complete_stage":
        # Handle request to complete stage when all players have completed their puzzles
        # This is sent by the host when all connected players have completed their puzzles

        # Verify the player is the host to avoid multiple requests
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

        # Advance to next stage
        room.stage += 1
        if room.stage > 5:
            # Game completed!
            room.status = "completed"

            # Update Redis
            store_room_data(room_code, room.dict())

            # Update in-memory
            if room_code in game_rooms:
                game_rooms[room_code].status = "completed"
                game_rooms[room_code].stage = room.stage

            await broadcast_to_room(room_code, {"type": "game_completed"})

            # Check if all players are disconnected to clean up the game
            asyncio.create_task(
                app.game_logic.cleanup_if_no_players_connected(room_code)
            )
        else:
            # Set up next stage
            room.puzzles = generate_puzzles(room, room.stage)
            room.timer += 240  # Add 4 minutes per stage

            # Reset stage completion tracking for the new stage
            new_stage = str(room.stage)
            room.stage_completion[new_stage] = {}

            # Update Redis
            store_room_data(room_code, room.dict())

            # Update in-memory
            if room_code in game_rooms:
                game_rooms[room_code].puzzles = room.puzzles
                game_rooms[room_code].timer = room.timer
                game_rooms[room_code].stage = room.stage
                game_rooms[room_code].stage_completion = room.stage_completion

            # Notify all players about the stage completion
            await broadcast_to_room(
                room_code,
                {"type": "stage_completed", "next_stage": room.stage},
            )

            # Send new puzzles to each player
            for pid, player_data in room.players.items():
                if pid in room.puzzles and pid in connected_players:
                    await connected_players[pid].send_json(
                        {"type": "puzzle_data", "puzzle": room.puzzles[pid]}
                    )
        return

    elif msg_type == "leave_game":
        # Player intentionally leaving the game
        logger.info(f"Player {player_id} is leaving game {room_code}")
        
        # Get player name before removing
        player_name = "Unknown"
        if player_id in room.players:
            player = room.players[player_id]
            if isinstance(player, dict):
                player_name = player.get("name", "Unknown")
            else:
                player_name = player.name
        
        # Remove player from the room
        if player_id in room.players:
            del room.players[player_id]
            
            # Update Redis
            store_room_data(room_code, room.dict())
            
            # Update in-memory for compatibility
            if room_code in game_rooms and player_id in game_rooms[room_code].players:
                del game_rooms[room_code].players[player_id]
        
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
                "message": f"{player_name} has left the game"
            }
        )
        
        # Count remaining players in the game
        connected_count = len(room.players)
        player_names = []
        
        for pid, player in room.players.items():
            if isinstance(player, dict):
                player_names.append(player.get("name", "Unknown"))
            else:
                player_names.append(player.name)
        
        # If game is in progress and fewer than 2 players remain, end the game
        if room.status == "in_progress" and connected_count < 2:
            logger.info(f"Game {room_code} ending due to insufficient players: {connected_count} remaining")
            
            # Mark game as failed
            room.status = "failed"
            
            # Update Redis
            store_room_data(room_code, room.dict())
            
            # Update in-memory for compatibility
            if room_code in game_rooms:
                game_rooms[room_code].status = "failed"
                
            # Create a descriptive message
            message = ""
            if connected_count == 0:
                message = "Game ended: All players have left."
            elif connected_count == 1:
                message = f"Game ended: Only one player ({player_names[0]}) remains."
            else:
                message = f"Game ended: Not enough players remaining."
                
            # Notify remaining players that the game is ending
            await broadcast_to_room(
                room_code, 
                {
                    "type": "game_over", 
                    "result": "insufficient_players",
                    "message": message,
                    "remaining_players": player_names,
                    "connected_count": connected_count
                }
            )
            
            # If room is now empty, clean it up
            if not room.players:
                logger.info(f"Room {room_code} is now empty, cleaning up")
                delete_room_data(room_code)
                if room_code in game_rooms:
                    del game_rooms[room_code]
                    
        return
