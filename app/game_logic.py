import random
import asyncio
from typing import Dict
import pydantic

# Use absolute imports instead of relative imports
import app.models
import app.utils
import app.redis_client

# Import Redis functions
from app.redis_client import store_room_data, get_room_data, cleanup_room_if_ended

# Get references to game_rooms and connected_players - keep for compatibility
game_rooms = app.utils.game_rooms
connected_players = app.utils.connected_players
broadcast_to_room = app.utils.broadcast_to_room

# Use GameRoom from app.models
GameRoom = app.models.GameRoom
Player = app.models.Player

# Add this to the GameRoom model initialization or update it to track stage completion
app.models.GameRoom.__pydantic_extra__ = pydantic.Extra.allow
if not hasattr(app.models.GameRoom, "stage_completion"):
    setattr(app.models.GameRoom, "stage_completion", {})


def have_all_players_completed_stage(room, stage_number: int) -> bool:
    """Check if all connected players have completed their puzzles for a stage

    Args:
        room: The GameRoom object
        stage_number: The stage number to check

    Returns:
        bool: True if all connected players have completed their puzzles
    """
    # Convert stage to string for dictionary key
    stage = str(stage_number)

    # Get stage completion data
    stage_completion = getattr(room, "stage_completion", {}).get(stage, {})

    # Get all connected players
    connected_players_ids = []
    for player_id, player in room.players.items():
        is_connected = False
        if isinstance(player, dict):
            is_connected = player.get("connected", False)
        else:
            is_connected = player.connected

        if is_connected:
            connected_players_ids.append(player_id)

    # If no connected players, return False
    if not connected_players_ids:
        return False

    # Check if all connected players have completed their puzzles
    for player_id in connected_players_ids:
        if player_id not in stage_completion or not stage_completion[player_id]:
            return False

    return True


def generate_puzzles(room, stage: int) -> Dict:
    """Generate puzzles for the given stage and room"""
    puzzles = {}

    # For stages 4 and 5, there's a 25% chance to generate only a team puzzle
    if stage > 3 and random.random() < 0.25:
        puzzles["team"] = generate_team_puzzle(stage, is_stage_completion=True)
        return puzzles

    # Otherwise, generate regular role-specific puzzles
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

    # Add team puzzles if needed for standard progression
    if stage >= 3:
        puzzles["team"] = generate_team_puzzle(stage, is_stage_completion=False)

    return puzzles


def generate_hacker_puzzle(stage: int) -> Dict:
    """Generate a puzzle for the Hacker role"""
    puzzle_types = {
        1: "circuit",
        2: "password_crack",
        3: "firewall_bypass",
        4: "encryption_key",
        5: "system_override",
    }

    # Return a properly structured puzzle object
    return {
        "type": puzzle_types[stage],
        "difficulty": stage,
        "data": {},  # Puzzle-specific data will be generated on the frontend
    }


def generate_safe_cracker_puzzle(stage: int) -> Dict:
    """Generate a puzzle for the Safe Cracker role"""
    puzzle_types = {
        1: "lock_combination",
        2: "pattern_recognition",
        3: "multi_lock",
        4: "audio_sequence",
        5: "timed_lock",
    }

    return {
        "type": puzzle_types[stage],
        "difficulty": stage,
        "data": {},  # Puzzle-specific data will be generated on the frontend
    }


def generate_demolitions_puzzle(stage: int) -> Dict:
    """Generate a puzzle for the Demolitions role"""
    puzzle_types = {
        1: "wire_cutting",
        2: "time_bomb",
        3: "circuit_board",
        4: "explosive_sequence",
        5: "final_detonation",
    }

    return {
        "type": puzzle_types[stage],
        "difficulty": stage,
        "data": {},  # Puzzle-specific data will be generated on the frontend
    }


def generate_lookout_puzzle(stage: int) -> Dict:
    """Generate a puzzle for the Lookout role"""
    puzzle_types = {
        1: "surveillance",
        2: "patrol_pattern",
        3: "security_system",
        4: "alarm",
        5: "escape_route",
    }

    return {
        "type": puzzle_types[stage],
        "difficulty": stage,
        "data": {},  # Puzzle-specific data will be generated on the frontend
    }


def generate_team_puzzle(stage: int, is_stage_completion=False) -> Dict:
    """Generate a team puzzle with option to mark it as stage completion puzzle"""
    # Default to stage-based puzzle type
    puzzle_type = f"team_puzzle_{stage}"

    # For specific stages, select from available team puzzles
    if stage == 3:
        puzzle_type = "team_puzzle_code_relay"
    elif stage == 4:
        puzzle_type = "team_puzzle_power_grid"
    elif stage == 5:
        # Randomly select one of the three advanced team puzzles
        advanced_puzzles = [
            "team_puzzle_pressure_plate",
            "team_puzzle_signal_frequency",
            "team_puzzle_data_chain",
        ]
        puzzle_type = random.choice(advanced_puzzles)

    return {
        "type": puzzle_type,
        "difficulty": stage,
        "required_roles": (
            ["Hacker", "Safe Cracker"]
            if stage == 3
            else ["Hacker", "Safe Cracker", "Demolitions", "Lookout"]
        ),
        "completes_stage": is_stage_completion,
        "data": {},
    }


def validate_puzzle_solution(puzzle: Dict, solution) -> bool:
    """Validate a puzzle solution"""
    puzzle_type = puzzle.get("type", "")

    # If solution is a simple boolean (commonly used in frontend validation)
    if isinstance(solution, bool):
        return solution

    # If solution is a dict with a success field (common pattern in newer puzzles)
    if isinstance(solution, dict) and "success" in solution:
        return solution["success"]

    # For specific puzzle types that might need server-side validation
    if puzzle_type == "circuit" and "solution" in puzzle.get("data", {}):
        # Circuit puzzle specific validation logic
        expected_solution = puzzle["data"]["solution"]
        return solution == expected_solution

    # Generic solution check for any puzzle type
    # For most puzzles, we'll trust the client-side validation
    # In a production environment, you would want more server-side validation
    # to prevent cheating
    return True


def handle_power_usage(room, player_id: str, role: str) -> bool:
    """Handle a role's power usage"""
    if role == "Hacker":
        # Enhance Hacker power: Slow down timer and reduce alert level
        room.timer += 45  # Give more time (45 seconds)
        if room.alert_level > 0:
            room.alert_level -= 1  # Reduce alert level as they hack security

        # Add power description for broadcast
        room.last_power_description = (
            "Slowed Security Systems - Added 45s and reduced alert level"
        )
        return True

    elif role == "Safe Cracker":
        # Enhanced Safe Cracker power: Reveal puzzle solution hints and extend timer
        room.timer += 30  # Add 30 seconds

        # Find the player's current puzzle
        if hasattr(room, "puzzles") and player_id in room.puzzles:
            puzzle = room.puzzles[player_id]
            # Mark the puzzle as having a hint
            puzzle["hint_active"] = True

            # If the puzzle has locks, reduce them
            if "locks" in puzzle and puzzle["locks"] > 0:
                puzzle["locks"] -= 1

        # Add power description for broadcast
        room.last_power_description = (
            "Lock Mastery - Revealed solution hints and added 30s"
        )
        return True

    elif role == "Demolitions":
        # Enhanced Demolitions power: Skip barriers in puzzles and temporarily reduce random events
        room.timer += 20  # Add 20 seconds
        room.shortcuts = getattr(room, "shortcuts", 0) + 1

        # Temporarily reduce random event chance (store original alert level)
        if not hasattr(room, "original_alert_level"):
            room.original_alert_level = room.alert_level
            room.alert_level = max(0, room.alert_level - 2)  # Reduce by 2 (min 0)

            # Schedule alert level restoration
            asyncio.create_task(restore_alert_level(room.code, 45))  # 45 second effect

        # Add power description for broadcast
        room.last_power_description = (
            "Structural Weakness - Created shortcuts and reduced event chance"
        )
        return True

    elif role == "Lookout":
        # Enhanced Lookout power: Predict future events and temporarily see security patterns
        room.next_events_visible = True

        # Schedule the async part of the Lookout power using the room code
        asyncio.create_task(
            handle_lookout_power(room_code=room.code, player_id=player_id)
        )

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
                    "message": "Demolitions effect expired. Alert level restored.",
                },
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
        "system_check": "System Check",
    }

    # Predict next 2 events
    predicted_events = []
    for _ in range(2):
        event_type = random.choice(event_types)
        predicted_time = random.randint(10, 30)  # seconds in the future
        display_name = event_names[event_type]
        predicted_events.append(
            {
                "event": event_type,
                "display_name": display_name,
                "predicted_time": predicted_time,
            }
        )

    # Send special notification only to the Lookout player if connected
    if player_id in connected_players:
        await connected_players[player_id].send_json(
            {
                "type": "lookout_prediction",
                "events": predicted_events,
                "duration": 60,  # Effect lasts 60 seconds
            }
        )

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
            "powerDescription": power_description,
        },
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
        asyncio.create_task(restore_lookout_effect(room_code, 60, original_level))

    # Set timeout to reset the prediction ability after 60 seconds
    await reset_lookout_ability(room_code, 60)


async def restore_lookout_effect(
    room_code: str, delay_seconds: int, original_level: int
):
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
                    "message": "Lookout's reduced alert effect has expired.",
                },
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
            room.timer % 15 == 0  # Every 15 seconds
            or (room.timer <= 30 and room.timer % 5 == 0)  # Every 5 seconds when <= 30s
            or room.timer <= 10  # Every second when <= 10s
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
    for player_data in room_data.get("players", {}).items():
        is_connected = False
        if isinstance(player_data, dict):
            is_connected = player_data.get("connected", False)
        else:
            is_connected = getattr(player_data, "connected", False)

        if is_connected:
            all_disconnected = False
            break

    if all_disconnected:
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
        if hasattr(room, "next_events_visible") and room.next_events_visible:
            # Send warning 5 seconds before event
            await broadcast_to_room(
                room_code,
                {
                    "type": "lookout_warning",
                    "event": event,
                    "warning_time": 5,
                    "message": f"Lookout detects {event.replace('_', ' ').title()} approaching in 5 seconds!",
                },
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
    time_remaining = getattr(room, "timer_vote_time_limit", 20)

    while time_remaining > 0:
        # Refresh room data on each iteration
        room_data = get_room_data(room_code)
        if not room_data:
            return

        room = GameRoom(**room_data)

        # Check if vote is still active
        if not hasattr(room, "timer_vote_active") or not room.timer_vote_active:
            return

        await asyncio.sleep(1)
        time_remaining -= 1

    # Process vote result when timer expires
    # Refresh room data one more time
    room_data = get_room_data(room_code)
    if room_data:
        room = GameRoom(**room_data)
        if hasattr(room, "timer_vote_active") and room.timer_vote_active:
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
    if not hasattr(room, "timer_votes") or not isinstance(room.timer_votes, dict):
        room.timer_votes = {"yes": [], "no": []}

    # Calculate results
    yes_votes = len(room.timer_votes.get("yes", []))
    no_votes = len(room.timer_votes.get("no", []))

    # Calculate required votes (majority of connected players)
    connected_player_count = sum(
        1
        for pid, p in room.players.items()
        if (isinstance(p, dict) and p.get("connected", False))
        or (hasattr(p, "connected") and p.connected)
    )

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
                "sync": True,  # Add sync flag to ensure clients synchronize
            },
        )
    else:
        # Update Redis (just to mark vote as inactive)
        store_room_data(room_code, room.dict())

        # Update in-memory for compatibility
        if room_code in game_rooms:
            game_rooms[room_code].timer_vote_active = False

    # Create detailed result message
    result_message = (
        "Timer extension vote failed" if not success else "Timer extended successfully"
    )
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
            "message": detailed_message,
        },
    )

    # Clean up vote data in room
    room.timer_votes = {"yes": [], "no": []}
    store_room_data(room_code, room.dict())

    # Clean up in-memory for compatibility
    if room_code in game_rooms:
        game_rooms[room_code].timer_votes = {"yes": [], "no": []}
