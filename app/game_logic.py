import random
import asyncio
from typing import Dict

# Use absolute imports instead of relative imports
import app.models
import app.utils

# Get references to game_rooms and connected_players
game_rooms = app.utils.game_rooms
connected_players = app.utils.connected_players
broadcast_to_room = app.utils.broadcast_to_room

# Use GameRoom from app.models
GameRoom = app.models.GameRoom


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


async def reset_lookout_ability(room_code: str, delay_seconds: int):
    """Reset the Lookout's ability after a delay"""
    await asyncio.sleep(delay_seconds)
    
    if room_code in game_rooms:
        game_rooms[room_code].next_events_visible = False


async def run_game_timer(room_code: str):
    """Run the game timer for a room"""
    room = game_rooms[room_code]
    
    # Send initial timer to ensure everyone is synchronized
    await broadcast_to_room(
        room_code, {"type": "timer_update", "timer": room.timer, "sync": True}
    )

    while room.timer > 0 and room.status == "in_progress":
        await asyncio.sleep(1)
        room.timer -= 1

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
                "sync": True  # Add sync flag to ensure clients synchronize
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