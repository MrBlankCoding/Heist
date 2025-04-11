import random
import asyncio
from typing import Dict

# Use absolute imports instead of relative imports
import app.models
import app.utils
import app.redis_client

# Import Redis functions
from app.redis_client import (
    store_room_data,
    get_room_data,
    store_player_data,
    get_player_data,
    cleanup_room_if_ended
)

# Get references to game_rooms and connected_players - keep for compatibility
game_rooms = app.utils.game_rooms
connected_players = app.utils.connected_players
broadcast_to_room = app.utils.broadcast_to_room

# Use GameRoom from app.models
GameRoom = app.models.GameRoom
Player = app.models.Player


def generate_puzzles(room, stage: int) -> Dict:
    """Generate puzzles for the given stage and room"""
    puzzles = {}

    # Generate role-specific puzzles
    for player_id, player_data in room.players.items():
        # Handle player data being either a dict or Player object
        role = ""
        if isinstance(player_data, dict):
            role = player_data.get("role", "")
        else:
            role = player_data.role
            
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


def validate_puzzle_solution(puzzle: Dict, solution) -> bool:
    """Validate a puzzle solution"""
    # In a real game, this would have more sophisticated validation
    puzzle_type = puzzle.get("type", "")

    # Example for circuit puzzle
    if puzzle_type == "circuit":
        return solution == puzzle["data"]["solution"]

    # Simple placeholder for other puzzle types
    return False


def handle_power_usage(room, player_id: str, role: str) -> bool:
    """Handle a role's power usage"""
    if role == "Hacker":
        # Enhance Hacker power: Slow down timer and reduce alert level
        room.timer += 45  # Give more time (45 seconds)
        if room.alert_level > 0:
            room.alert_level -= 1  # Reduce alert level as they hack security
        
        # Add power description for broadcast
        room.last_power_description = "Slowed Security Systems - Added 45s and reduced alert level"
        return True
        
    elif role == "Safe Cracker":
        # Enhanced Safe Cracker power: Reveal puzzle solution hints and extend timer
        room.timer += 30  # Add 30 seconds
        
        # Find the player's current puzzle
        if hasattr(room, 'puzzles') and player_id in room.puzzles:
            puzzle = room.puzzles[player_id]
            # Mark the puzzle as having a hint
            puzzle["hint_active"] = True
            
            # If the puzzle has locks, reduce them
            if "locks" in puzzle and puzzle["locks"] > 0:
                puzzle["locks"] -= 1
            
        # Add power description for broadcast
        room.last_power_description = "Lock Mastery - Revealed solution hints and added 30s"
        return True
        
    elif role == "Demolitions":
        # Enhanced Demolitions power: Skip barriers in puzzles and temporarily reduce random events
        room.timer += 20  # Add 20 seconds
        room.shortcuts = getattr(room, 'shortcuts', 0) + 1
        
        # Temporarily reduce random event chance (store original alert level)
        if not hasattr(room, "original_alert_level"):
            room.original_alert_level = room.alert_level
            room.alert_level = max(0, room.alert_level - 2)  # Reduce by 2 (min 0)
            
            # Schedule alert level restoration
            asyncio.create_task(restore_alert_level(room.code, 45))  # 45 second effect
        
        # Add power description for broadcast
        room.last_power_description = "Structural Weakness - Created shortcuts and reduced event chance"
        return True
        
    elif role == "Lookout":
        # Enhanced Lookout power: Predict future events and temporarily see security patterns
        room.next_events_visible = True
        
        # Schedule the async part of the Lookout power using the room code
        asyncio.create_task(handle_lookout_power(room_code=room.code, player_id=player_id))
        
        # Add power description for broadcast - will be set in handle_lookout_power
        # This is done to avoid duplicating the broadcast
        return True

    return False


async def restore_alert_level(room_code: str, delay_seconds: int):
    """Restore the original alert level after Demolitions power expires"""
    await asyncio.sleep(delay_seconds)
    
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if room_data:
        room = GameRoom(**room_data)
        
        if hasattr(room, "original_alert_level"):
            room.alert_level = room.original_alert_level
            
            # Remove the original_alert_level attribute
            if hasattr(room, "original_alert_level"):
                delattr(room, "original_alert_level")
            
            # Update Redis
            store_room_data(room_code, room.dict())
            
            # Update in-memory for compatibility
            if room_code in game_rooms:
                game_rooms[room_code].alert_level = room.alert_level
                if hasattr(game_rooms[room_code], "original_alert_level"):
                    delattr(game_rooms[room_code], "original_alert_level")
            
            # Notify players that the effect has expired
            await broadcast_to_room(
                room_code,
                {
                    "type": "system_message",
                    "message": "Demolitions effect expired. Alert level restored."
                }
            )


async def handle_lookout_power(room_code: str, player_id: str):
    """Handle the async parts of the Lookout power"""
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data or player_id not in connected_players:
        return
    
    room = GameRoom(**room_data)
        
    # Generate a future event prediction
    event_types = ["security_patrol", "camera_sweep", "system_check"]
    event_names = {
        "security_patrol": "Security Patrol",
        "camera_sweep": "Camera Sweep",
        "system_check": "System Check"
    }
    
    # Predict next 2 events
    predicted_events = []
    for _ in range(2):
        event_type = random.choice(event_types)
        predicted_time = random.randint(10, 30)  # seconds in the future
        display_name = event_names[event_type]
        predicted_events.append({
            "event": event_type,
            "display_name": display_name,
            "predicted_time": predicted_time
        })
    
    # Send special notification only to the Lookout player if connected
    if player_id in connected_players:
        await connected_players[player_id].send_json({
            "type": "lookout_prediction",
            "events": predicted_events,
            "duration": 60  # Effect lasts 60 seconds
        })
    
    # Get player name
    player_name = ""
    if player_id in room.players:
        player = room.players[player_id]
        if isinstance(player, dict):
            player_name = player.get("name", "Unknown")
        else:
            player_name = player.name
    
    # Create power description for other players
    power_description = "Enhanced Security Detection - Can predict upcoming events"
    
    # Add power description to broadcast
    await broadcast_to_room(
        room_code,
        {
            "type": "power_used",
            "player_id": player_id,
            "player_name": player_name,
            "role": "Lookout",
            "powerDescription": power_description
        }
    )
    
    # Add a status boost - temporarily reduce current alert level
    if room.alert_level > 0:
        original_level = room.alert_level
        room.alert_level -= 1
        
        # Update Redis
        store_room_data(room_code, room.dict())
        
        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].alert_level = room.alert_level
        
        # Schedule alert level restoration
        asyncio.create_task(
            restore_lookout_effect(room_code, 60, original_level)
        )
    
    # Set timeout to reset the prediction ability after 60 seconds
    await reset_lookout_ability(room_code, 60)


async def restore_lookout_effect(room_code: str, delay_seconds: int, original_level: int):
    """Restore the alert level after Lookout power effect expires"""
    await asyncio.sleep(delay_seconds)
    
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if room_data:
        room = GameRoom(**room_data)
        
        # Only restore if current alert level is lower than original
        if room.alert_level < original_level:
            room.alert_level = original_level
            
            # Update Redis
            store_room_data(room_code, room.dict())
            
            # Update in-memory for compatibility
            if room_code in game_rooms:
                game_rooms[room_code].alert_level = original_level
            
            # Notify players that the effect has expired
            await broadcast_to_room(
                room_code,
                {
                    "type": "system_message",
                    "message": "Lookout's reduced alert effect has expired."
                }
            )


async def reset_lookout_ability(room_code: str, delay_seconds: int):
    """Reset the Lookout's ability after a delay"""
    await asyncio.sleep(delay_seconds)
    
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if room_data:
        room = GameRoom(**room_data)
        room.next_events_visible = False
        
        # Update Redis
        store_room_data(room_code, room.dict())
        
        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].next_events_visible = False


async def run_game_timer(room_code: str):
    """Run the game timer for a room"""
    # Get initial room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return
    
    room = GameRoom(**room_data)
    
    # Send initial timer to ensure everyone is synchronized
    await broadcast_to_room(
        room_code, {"type": "timer_update", "timer": room.timer, "sync": True}
    )

    while True:
        # Refresh room data from Redis for each iteration
        room_data = get_room_data(room_code)
        if not room_data:
            break
            
        room = GameRoom(**room_data)
        
        # Check if timer has expired or game is no longer in progress
        if room.timer <= 0 or room.status != "in_progress":
            break
            
        await asyncio.sleep(1)
        room.timer -= 1
        
        # Update Redis with new timer value
        store_room_data(room_code, room.dict())
        
        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].timer = room.timer

        # Only send timer updates at specific intervals to reduce traffic:
        # - Every 15 seconds for regular updates
        # - Every 5 seconds when under 30 seconds
        # - Every second when under 10 seconds
        # - When random events occur
        # - When timer is paused/resumed
        should_send = (
            room.timer % 15 == 0 or  # Every 15 seconds
            (room.timer <= 30 and room.timer % 5 == 0) or  # Every 5 seconds when <= 30s
            room.timer <= 10  # Every second when <= 10s
        )
        
        if should_send:
            await broadcast_to_room(
                room_code, {"type": "timer_update", "timer": room.timer, "sync": True}
            )

        # Check for random events every 30 seconds
        if room.timer % 30 == 0:
            await trigger_random_event(room_code)

        # Game over when timer runs out
        if room.timer <= 0:
            room.status = "failed"
            
            # Update Redis
            store_room_data(room_code, room.dict())
            
            # Update in-memory for compatibility
            if room_code in game_rooms:
                game_rooms[room_code].status = "failed"
                
            await broadcast_to_room(
                room_code, {"type": "game_over", "result": "time_expired"}
            )
            
            # Schedule cleanup check after a delay to give players time to see the result
            asyncio.create_task(cleanup_if_no_players_connected(room_code))
            break


async def cleanup_if_no_players_connected(room_code: str):
    """Check if all players have disconnected from a game, and if so, clean up"""
    # Give players some time to see game results before checking for cleanup
    await asyncio.sleep(5)
    
    # Get updated room data
    room_data = get_room_data(room_code)
    if not room_data:
        return  # Room already cleaned up
    
    # Check if all players are disconnected
    all_disconnected = True
    for player_id, player_data in room_data.get("players", {}).items():
        is_connected = False
        if isinstance(player_data, dict):
            is_connected = player_data.get("connected", False)
        else:
            is_connected = getattr(player_data, "connected", False)
        
        if is_connected:
            all_disconnected = False
            break
    
    if all_disconnected:
        # All players are disconnected, clean up the room
        print(f"All players disconnected from finished game {room_code}, cleaning up")
        cleanup_room_if_ended(room_code)


async def trigger_random_event(room_code: str):
    """Trigger a random event in the game"""
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return
        
    room = GameRoom(**room_data)

    # Higher alert level = more chance of events
    # Use original_alert_level if set (from Demolitions power)
    alert_level = getattr(room, "original_alert_level", room.alert_level)
    
    if random.random() < (0.2 + (alert_level * 0.1)):
        event_types = ["security_patrol", "camera_sweep", "system_check"]
        event = random.choice(event_types)
        event_duration = random.randint(5, 15)
        
        # If Lookout's power is active, send a warning to all players
        if hasattr(room, 'next_events_visible') and room.next_events_visible:
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


async def run_vote_timer(room_code: str):
    """Run timer for vote completion"""
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return
        
    room = GameRoom(**room_data)
    
    # Wait for vote time limit
    time_remaining = getattr(room, 'timer_vote_time_limit', 20)
    
    while time_remaining > 0:
        # Refresh room data on each iteration
        room_data = get_room_data(room_code)
        if not room_data:
            return
            
        room = GameRoom(**room_data)
        
        # Check if vote is still active
        if not hasattr(room, 'timer_vote_active') or not room.timer_vote_active:
            return
            
        await asyncio.sleep(1)
        time_remaining -= 1
    
    # Process vote result when timer expires
    # Refresh room data one more time
    room_data = get_room_data(room_code)
    if room_data:
        room = GameRoom(**room_data)
        if hasattr(room, 'timer_vote_active') and room.timer_vote_active:
            await process_timer_vote_result(room_code)


async def process_timer_vote_result(room_code: str):
    """Process the timer vote result"""
    # Get room data from Redis
    room_data = get_room_data(room_code)
    if not room_data:
        return
        
    room = GameRoom(**room_data)
    
    # Mark vote as inactive
    room.timer_vote_active = False
    
    # Initialize votes if needed
    if not hasattr(room, 'timer_votes') or not isinstance(room.timer_votes, dict):
        room.timer_votes = {"yes": [], "no": []}
    
    # Calculate results
    yes_votes = len(room.timer_votes.get("yes", []))
    no_votes = len(room.timer_votes.get("no", []))
    all_votes = yes_votes + no_votes
    
    # Calculate required votes (majority of connected players)
    connected_player_count = sum(1 for pid, p in room.players.items() 
                                 if (isinstance(p, dict) and p.get("connected", False)) or 
                                    (hasattr(p, "connected") and p.connected))
                                    
    required_votes = max(1, connected_player_count // 2 + 1)  # Majority
    
    # Determine success
    success = yes_votes >= required_votes
    
    if success:
        # Extend the timer
        room.timer += 60  # Add 1 minute
        room.alert_level += 1  # Increase alert level
        
        # Update Redis
        store_room_data(room_code, room.dict())
        
        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].timer = room.timer
            game_rooms[room_code].alert_level = room.alert_level
            game_rooms[room_code].timer_vote_active = False
        
        # Broadcast timer extended
        await broadcast_to_room(
            room_code,
            {
                "type": "timer_extended",
                "new_timer": room.timer,
                "alert_level": room.alert_level,
                "sync": True  # Add sync flag to ensure clients synchronize
            },
        )
    else:
        # Update Redis (just to mark vote as inactive)
        store_room_data(room_code, room.dict())
        
        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].timer_vote_active = False
    
    # Create detailed result message
    result_message = "Timer extension vote failed" if not success else "Timer extended successfully"
    detailed_message = f"{result_message} ({yes_votes} yes / {no_votes} no of {connected_player_count} players)"
    
    # Broadcast vote completion to all players
    all_voters = room.timer_votes.get("yes", []) + room.timer_votes.get("no", [])
    
    await broadcast_to_room(
        room_code,
        {
            "type": "timer_vote_completed",
            "success": success,
            "votes": all_voters,
            "required_votes": required_votes,
            "yes_votes": yes_votes,
            "no_votes": no_votes,
            "total_players": connected_player_count,
            "message": detailed_message
        }
    )
    
    # Clean up vote data in room
    room.timer_votes = {"yes": [], "no": []}
    store_room_data(room_code, room.dict())
    
    # Clean up in-memory for compatibility
    if room_code in game_rooms:
        game_rooms[room_code].timer_votes = {"yes": [], "no": []} 