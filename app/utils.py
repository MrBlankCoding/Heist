import json
import logging
import os
import random
from typing import Dict, Optional

from fastapi import WebSocket

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.utils")

# Global storage for active WebSocket connections
# This cannot be stored in Redis since WebSocket objects are not serializable
connected_players = {}

# Still needed for compatibility in some places, but should be phased out
# This is just a temporary cache, all real data comes from Redis
game_rooms = {}

# WebSocket connection prefix for Redis
WS_CONNECTION_PREFIX = "ws_connection:"


def generate_room_code() -> str:
    """Generate a unique 4-character room code"""
    from app.redis_client import get_room_data

    while True:
        code = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=4))
        # Check if room exists in Redis
        if not get_room_data(code):
            return code


def store_connection(player_id: str, websocket: WebSocket) -> None:
    """Store active WebSocket connection"""
    connected_players[player_id] = websocket


def get_connection(player_id: str) -> Optional[WebSocket]:
    """Get active WebSocket connection"""
    return connected_players.get(player_id)


def remove_connection(player_id: str) -> None:
    """Remove WebSocket connection"""
    if player_id in connected_players:
        del connected_players[player_id]


async def broadcast_to_room(
    room_code: str, message: Dict, exclude_player_id: str = None
) -> None:
    """Broadcast a message to all players in a room

    Args:
        room_code: Room code to broadcast to
        message: Message to broadcast
        exclude_player_id: Optional player ID to exclude from broadcast
    """
    try:
        from app.redis_client import get_players_in_room

        # Get all player IDs in the room from Redis
        player_ids = get_players_in_room(room_code)

        if not player_ids:
            print(f"No players in room {room_code}")
            return

        # Convert message to JSON once
        message_json = json.dumps(message)

        # Send to all connected players
        sent_count = 0
        connection_errors = []

        for player_id in player_ids:
            if exclude_player_id and player_id == exclude_player_id:
                continue

            if player_id in connected_players:
                try:
                    await connected_players[player_id].send_text(message_json)
                    sent_count += 1
                except Exception as e:
                    error_msg = str(e)
                    connection_errors.append(
                        f"Error sending to {player_id}: {error_msg}"
                    )

                    # Mark disconnection but don't raise the exception
                    try:
                        remove_connection(player_id)
                    except Exception as e2:
                        print(f"Error removing connection for {player_id}: {e2}")

        if connection_errors:
            # Log errors but don't throw exception
            print(
                f"Broadcast errors in room {room_code} for message type '{message.get('type', 'unknown')}': {connection_errors}"
            )

        return sent_count

    except Exception as e:
        # Log the error but don't propagate it
        print(f"Fatal error in broadcast_to_room for {room_code}: {e}")
        return 0


def get_environment_variable(name: str, default: str = None) -> str:
    """Get environment variable with default value"""
    return os.getenv(name, default)


def get_boolean_env(name: str, default: bool = False) -> bool:
    """Get boolean environment variable"""
    value = os.getenv(name, str(default)).lower()
    return value in ("true", "1", "t", "yes", "y")
