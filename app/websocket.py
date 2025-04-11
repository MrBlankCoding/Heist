from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from typing import Dict

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
    delete_room_data
)

# Get references to shared resources - still needed for WebSocket connections
game_rooms = app.utils.game_rooms
connected_players = app.utils.connected_players
broadcast_to_room = app.utils.broadcast_to_room

# Import functions from game_logic
generate_puzzles = app.game_logic.generate_puzzles
validate_puzzle_solution = app.game_logic.validate_puzzle_solution
handle_power_usage = app.game_logic.handle_power_usage
run_game_timer = app.game_logic.run_game_timer
process_timer_vote_result = app.game_logic.process_timer_vote_result
run_vote_timer = app.game_logic.run_vote_timer

# Import models
Player = app.models.Player
GameRoom = app.models.GameRoom


async def websocket_endpoint(websocket: WebSocket, room_code: str, player_id: str):
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

    # Store the WebSocket connection
    connected_players[player_id] = websocket

    # Mark player as connected
    if isinstance(room.players[player_id], dict):
        room.players[player_id]["connected"] = True
        player = Player(**room.players[player_id])
    else:
        room.players[player_id].connected = True
        player = room.players[player_id]
    
    # Update player data in Redis
    player_data = get_player_data(player_id)
    if player_data:
        player_data["connected"] = True
        store_player_data(player_id, player_data)
        
    # Update room data in Redis
    store_room_data(room_code, room.dict())
    
    # Also update in-memory GameRoom for compatibility
    if room_code in game_rooms:
        if player_id in game_rooms[room_code].players:
            game_rooms[room_code].players[player_id].connected = True
    else:
        game_rooms[room_code] = room

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

    if room.status == "in_progress":
        # Send puzzle data
        if "puzzles" in room_data and player_id in room_data["puzzles"]:
            await websocket.send_json(
                {"type": "puzzle_data", "puzzle": room_data["puzzles"][player_id]}
            )

    try:
        # Main WebSocket message loop
        while True:
            data = await websocket.receive_text()
            await process_websocket_message(room_code, player_id, json.loads(data))
    except WebSocketDisconnect:
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
                
                # Update player data
                player_data = get_player_data(player_id)
                if player_data:
                    player_data["connected"] = False
                    store_player_data(player_id, player_data)
        
        # Also update in-memory room
        if room_code in game_rooms and player_id in game_rooms[room_code].players:
            game_rooms[room_code].players[player_id].connected = False
            
        if player_id in connected_players:
            del connected_players[player_id]

        # Notify other players
        await broadcast_to_room(
            room_code, {"type": "player_disconnected", "player_id": player_id}
        )
        
        # Check if the game has ended and clean up if needed
        if room_data:
            game_status = room_data.get("status", "")
            if game_status in ["completed", "failed"]:
                # Check if all players are now disconnected
                all_disconnected = True
                for pid, p_data in room_data.get("players", {}).items():
                    if pid == player_id:
                        continue  # Skip the player who just disconnected
                    
                    is_connected = False
                    if isinstance(p_data, dict):
                        is_connected = p_data.get("connected", False)
                    else:
                        is_connected = getattr(p_data, "connected", False)
                    
                    if is_connected:
                        all_disconnected = False
                        break
                
                if all_disconnected:
                    # All players disconnected and game is over, clean up
                    print(f"All players disconnected from finished game {room_code}, cleaning up")
                    
                    # Clean up all player data for this room
                    for pid in room_data.get("players", {}).keys():
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

    msg_type = message.get("type", "")
    
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
            if isinstance(player, dict):
                if not player.get("role"):
                    players_without_roles.append(player.get("name", "Unknown"))
            else:
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

        # Update Redis
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
        return
        
    elif msg_type == "puzzle_solution":
        # Validate puzzle solution
        if "puzzles" in room_data and player_id in room_data["puzzles"]:
            puzzle = room_data["puzzles"][player_id]
            if validate_puzzle_solution(puzzle, message.get("solution")):
                # Mark puzzle as completed
                room_data["puzzles"][player_id]["completed"] = True
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
                    },
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
                        await broadcast_to_room(room_code, {"type": "team_puzzle_ready"})
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
                                
                            await broadcast_to_room(room_code, {"type": "game_completed"})
                            
                            # Check if all players are disconnected to clean up the game
                            # Use asyncio to run the cleanup check after a delay
                            asyncio.create_task(app.game_logic.cleanup_if_no_players_connected(room_code))
                        else:
                            # Set up next stage
                            room.puzzles = generate_puzzles(room, room.stage)
                            room.timer += 240  # Add 4 minutes per stage
                            
                            # Update Redis
                            store_room_data(room_code, room.dict())
                            
                            # Update in-memory
                            if room_code in game_rooms:
                                game_rooms[room_code].puzzles = room.puzzles
                                game_rooms[room_code].timer = room.timer
                                game_rooms[room_code].stage = room.stage

                            await broadcast_to_room(
                                room_code,
                                {"type": "stage_completed", "next_stage": room.stage},
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
                    
            power_description = getattr(room, 'last_power_description', f"{player_role} Power")
            
            await broadcast_to_room(
                room_code, 
                {
                    "type": "power_used", 
                    "player_id": player_id, 
                    "player_name": player_name,
                    "role": player_role,
                    "powerDescription": power_description
                }
            )

    elif msg_type == "initiate_timer_vote":
        # Check if there's an active vote already
        if hasattr(room, 'timer_vote_active') and room.timer_vote_active:
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
                        "connected": True
                    }
            else:
                if player_data.connected:
                    connected_players_data[pid] = {
                        "id": pid,
                        "name": player_data.name,
                        "role": player_data.role,
                        "connected": True
                    }
        
        # Broadcast vote initiated to all players
        await broadcast_to_room(
            room_code,
            {
                "type": "timer_vote_initiated",
                "initiator_id": player_id,
                "initiator_name": player_name,
                "vote_time_limit": getattr(room, 'timer_vote_time_limit', 20),
                "votes": [],  # No votes yet
                "players": connected_players_data
            }
        )
        
        # Start timer for vote completion
        asyncio.create_task(run_vote_timer(room_code))
    
    elif msg_type == "extend_timer_vote":
        # Check if there's an active vote
        if not hasattr(room, 'timer_vote_active') or not room.timer_vote_active:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "timer_vote",
                "message": "No timer extension vote is currently active"
            })
            return
        
        # Get current votes
        if not hasattr(room, 'timer_votes') or not isinstance(room.timer_votes, dict):
            room.timer_votes = {"yes": [], "no": []}
        
        yes_votes = room.timer_votes.get("yes", [])
        no_votes = room.timer_votes.get("no", [])
        
        # Check if player already voted
        if player_id in yes_votes or player_id in no_votes:
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "timer_vote",
                "message": "You have already voted"
            })
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
                        "connected": True
                    }
            else:
                if player_data.connected:
                    connected_players_data[pid] = {
                        "id": pid,
                        "name": player_data.name,
                        "role": player_data.role,
                        "connected": True
                    }
        
        # Broadcast vote update
        await broadcast_to_room(
            room_code,
            {
                "type": "timer_vote_update",
                "player_id": player_id,
                "vote": vote_type == "yes",
                "votes": all_voters,
                "players": connected_players_data
            }
        )
        
        # Check if everyone has voted
        connected_player_count = sum(1 for pid, p in room.players.items() 
                                      if (isinstance(p, dict) and p.get("connected", False)) or 
                                         (hasattr(p, "connected") and p.connected))
        
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
            await connected_players[player_id].send_json({
                "type": "error",
                "context": "role_selection",
                "message": "No role specified"
            })
            return
            
        # Check if role is already taken
        for p_id, player_data in room.players.items():
            player_role = ""
            if isinstance(player_data, dict):
                player_role = player_data.get("role", "")
            else:
                player_role = player_data.role
                
            if player_role == role and p_id != player_id:
                await connected_players[player_id].send_json({
                    "type": "error",
                    "context": "role_selection",
                    "message": "Role already taken"
                })
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
                "players": all_players
            }
        )