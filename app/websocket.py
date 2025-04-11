from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from typing import Dict

# Use absolute imports
import app.models
import app.utils
import app.game_logic

# Get references to shared resources
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