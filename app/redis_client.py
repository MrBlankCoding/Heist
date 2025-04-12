import json
import redis
import os
import time
import asyncio
import logging
from redis.retry import Retry
from redis.backoff import ExponentialBackoff
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Redis URI from environment variable
REDIS_URI = os.getenv("REDIS_URI")

if not REDIS_URI:
    raise EnvironmentError("REDIS_URI environment variable is not set")

# Redis client configuration
REDIS_POOL_SIZE = int(os.getenv("REDIS_POOL_SIZE", "10"))
REDIS_SOCKET_TIMEOUT = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
REDIS_RETRY_MAX_ATTEMPTS = int(os.getenv("REDIS_RETRY_MAX_ATTEMPTS", "3"))

# Configure Redis with connection pooling and retry mechanism
redis_retry = Retry(ExponentialBackoff(), REDIS_RETRY_MAX_ATTEMPTS)

# Initialize Redis client using the URI from .env with connection pooling
redis_client = redis.from_url(
    REDIS_URI,
    decode_responses=True,
    socket_timeout=REDIS_SOCKET_TIMEOUT,
    socket_keepalive=True,
    health_check_interval=30,
    retry=redis_retry,
    max_connections=REDIS_POOL_SIZE,
)

# Key prefixes
ROOM_PREFIX = "room:"
PLAYER_PREFIX = "player:"
PLAYER_ROOM_PREFIX = "player_room:"
CONNECTION_PREFIX = "connection:"
ROOM_CONNECTIONS_PREFIX = "room_connections:"

# Define maximum inactive time for rooms (in seconds)
MAX_ROOM_IDLE_TIME = int(os.getenv("MAX_ROOM_IDLE_TIME", "3600"))  # 1 hour by default
LAST_ACTIVITY_FIELD = "last_activity"

# Cache TTL settings
ROOM_DATA_TTL = int(os.getenv("ROOM_DATA_TTL", "86400"))  # 24 hours by default
PLAYER_DATA_TTL = int(os.getenv("PLAYER_DATA_TTL", "43200"))  # 12 hours by default
CONNECTION_TTL = 3600  # 1 hour

# Game settings
DEFAULT_GAME_TIMER = int(os.getenv("DEFAULT_GAME_TIMER", "300"))  # 5 minutes
DEFAULT_VOTE_TIME_LIMIT = int(os.getenv("DEFAULT_VOTE_TIME_LIMIT", "20"))  # 20 seconds

# Return codes
SUCCESS = True
FAILURE = False


def store_room_data(room_code: str, room_data: Dict) -> bool:
    """Store room data in Redis with TTL"""
    if not room_code or not room_data:
        return FAILURE

    try:
        # Add last activity timestamp
        room_data[LAST_ACTIVITY_FIELD] = int(time.time())

        key = f"{ROOM_PREFIX}{room_code}"
        serialized_data = json.dumps(room_data)

        # Use pipeline for atomic operations
        with redis_client.pipeline() as pipe:
            pipe.set(key, serialized_data)
            pipe.expire(key, ROOM_DATA_TTL)
            pipe.execute()

        return SUCCESS
    except redis.RedisError as e:
        return FAILURE
    except Exception as e:
        return FAILURE


def get_room_data(room_code: str) -> Optional[Dict]:
    """Get room data from Redis"""
    if not room_code:
        return None

    try:
        key = f"{ROOM_PREFIX}{room_code}"
        data = redis_client.get(key)
        if data:
            # Refresh TTL on access
            redis_client.expire(key, ROOM_DATA_TTL)
            return json.loads(data)
        return None
    except json.JSONDecodeError as e:
        return None
    except redis.RedisError as e:
        return None
    except Exception as e:
        return None


def get_all_room_codes() -> List[str]:
    """Get all room codes stored in Redis"""
    try:
        keys = redis_client.keys(f"{ROOM_PREFIX}*")
        return [key.replace(ROOM_PREFIX, "") for key in keys]
    except redis.RedisError as e:
        return []
    except Exception as e:
        return []


def store_player_data(player_id: str, player_data: Dict) -> bool:
    """Store player data in Redis with TTL"""
    if not player_id or not player_data:
        return FAILURE

    try:
        key = f"{PLAYER_PREFIX}{player_id}"
        serialized_data = json.dumps(player_data)

        # Use pipeline for atomic operations
        with redis_client.pipeline() as pipe:
            pipe.set(key, serialized_data)
            pipe.expire(key, PLAYER_DATA_TTL)
            pipe.execute()

        return SUCCESS
    except redis.RedisError as e:
        return FAILURE
    except Exception as e:
        return FAILURE


def get_player_data(player_id: str) -> Optional[Dict]:
    """Get player data from Redis"""
    if not player_id:
        return None

    try:
        key = f"{PLAYER_PREFIX}{player_id}"
        data = redis_client.get(key)
        if data:
            # Refresh TTL on access
            redis_client.expire(key, PLAYER_DATA_TTL)
            return json.loads(data)
        return None
    except json.JSONDecodeError as e:
        return None
    except redis.RedisError as e:
        return None
    except Exception as e:
        return None


def associate_player_with_room(player_id: str, room_code: str) -> bool:
    """Associate player with room for quick lookup with TTL"""
    if not player_id or not room_code:
        return FAILURE

    try:
        key = f"{PLAYER_ROOM_PREFIX}{player_id}"

        # Use pipeline for atomic operations
        with redis_client.pipeline() as pipe:
            pipe.set(key, room_code)
            pipe.expire(key, PLAYER_DATA_TTL)

            # Add player to room's connection set
            room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
            pipe.sadd(room_connections_key, player_id)
            pipe.expire(room_connections_key, ROOM_DATA_TTL)

            pipe.execute()

        return SUCCESS
    except redis.RedisError as e:
        return FAILURE
    except Exception as e:
        return FAILURE


def get_player_room(player_id: str) -> Optional[str]:
    """Get room code for a player"""
    if not player_id:
        return None

    try:
        key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        room_code = redis_client.get(key)

        if room_code:
            # Refresh TTL on access
            redis_client.expire(key, PLAYER_DATA_TTL)

        return room_code
    except redis.RedisError as e:
        return None
    except Exception as e:
        return None


def mark_player_connection_status(player_id: str, connected: bool) -> bool:
    """Mark a player as connected or disconnected"""
    if not player_id:
        return FAILURE

    try:
        player_data = get_player_data(player_id)
        if not player_data:
            return FAILURE

        # Update connection status
        player_data["connected"] = connected

        # Record connection timestamp if connected
        if connected:
            player_data["last_connected"] = int(time.time())

        # Update player data
        return store_player_data(player_id, player_data)
    except Exception as e:
        return FAILURE


def get_players_in_room(room_code: str) -> List[str]:
    """Get list of player IDs in a room"""
    if not room_code:
        return []

    try:
        # First try to get from room connections set
        room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
        player_ids = redis_client.smembers(room_connections_key)

        if player_ids:
            # Refresh TTL on access
            redis_client.expire(room_connections_key, ROOM_DATA_TTL)
            return list(player_ids)

        # Fallback to getting from room data
        room_data = get_room_data(room_code)
        if not room_data or not room_data.get("players"):
            return []

        # Get player IDs and update the connections set
        player_ids = list(room_data["players"].keys())

        # Update the connections set
        if player_ids:
            with redis_client.pipeline() as pipe:
                pipe.sadd(room_connections_key, *player_ids)
                pipe.expire(room_connections_key, ROOM_DATA_TTL)
                pipe.execute()

        return player_ids
    except redis.RedisError as e:
        return []
    except Exception as e:
        return []


def get_connected_players_in_room(room_code: str) -> List[str]:
    """Get list of connected player IDs in a room"""
    if not room_code:
        return []

    try:
        player_ids = get_players_in_room(room_code)
        connected_players = []

        # Check each player's connection status
        for player_id in player_ids:
            player_data = get_player_data(player_id)
            if player_data and player_data.get("connected", False):
                connected_players.append(player_id)

        return connected_players
    except Exception as e:
        return []


def delete_player_data(player_id: str) -> bool:
    """Delete player data from Redis"""
    if not player_id:
        return FAILURE

    try:
        # Get the room this player belongs to
        room_code = get_player_room(player_id)

        player_key = f"{PLAYER_PREFIX}{player_id}"
        room_key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        connection_key = f"{CONNECTION_PREFIX}{player_id}"

        # Use pipeline for batch deletion
        with redis_client.pipeline() as pipe:
            pipe.delete(player_key, room_key, connection_key)

            # Remove from room connections set if room code is known
            if room_code:
                room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
                pipe.srem(room_connections_key, player_id)

            pipe.execute()

        return SUCCESS
    except redis.RedisError as e:
        return FAILURE
    except Exception as e:
        return FAILURE


def delete_room_data(room_code: str) -> bool:
    """Delete room data from Redis"""
    if not room_code:
        return FAILURE

    try:
        # Get all players in the room first
        player_ids = get_players_in_room(room_code)

        # Use pipeline for batch operations
        with redis_client.pipeline() as pipe:
            # Delete room data
            room_key = f"{ROOM_PREFIX}{room_code}"
            room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
            pipe.delete(room_key, room_connections_key)

            # Delete player-room associations but keep player data
            for player_id in player_ids:
                player_room_key = f"{PLAYER_ROOM_PREFIX}{player_id}"
                pipe.delete(player_room_key)

            pipe.execute()

        return SUCCESS
    except redis.RedisError as e:
        return FAILURE
    except Exception as e:
        return FAILURE


def cleanup_player_data(player_id: str) -> bool:
    """Clean up all player data when leaving a game"""
    if not player_id:
        return FAILURE

    try:
        # First get the room this player belongs to
        room_code = get_player_room(player_id)
        if room_code:
            # Get room data
            room_data = get_room_data(room_code)
            if (
                room_data
                and "players" in room_data
                and player_id in room_data["players"]
            ):
                # Log player leaving
                player_data = room_data["players"].get(player_id, {})
                player_name = (
                    player_data.get("name", "Unknown player")
                    if isinstance(player_data, dict)
                    else getattr(player_data, "name", "Unknown player")
                )

                # Remove player from the room's player list
                del room_data["players"][player_id]

                # Update the room data
                store_room_data(room_code, room_data)

                # Check if the room is now empty
                if not room_data["players"]:
                    # If room is empty, delete the room
                    delete_room_data(room_code)
                elif room_data.get("status") in ["completed", "failed"]:
                    # If the game has ended, check if all players have disconnected
                    all_disconnected = True
                    for player_data in room_data["players"].values():
                        if isinstance(player_data, dict) and player_data.get(
                            "connected", False
                        ):
                            all_disconnected = False
                            break
                        elif (
                            hasattr(player_data, "connected") and player_data.connected
                        ):
                            all_disconnected = False
                            break

                    if all_disconnected:
                        # All players have disconnected and the game is over, delete the room
                        delete_room_data(room_code)

        # Now delete the player data
        delete_player_data(player_id)
        return SUCCESS
    except redis.RedisError as e:
        return FAILURE
    except Exception as e:
        return FAILURE


import time
import asyncio

# Constants (define these properly elsewhere in your project)
PLAYER_PREFIX = "player:"
PLAYER_ROOM_PREFIX = "player_room:"
ROOM_PREFIX = "room:"
ROOM_CONNECTIONS_PREFIX = "room_connections:"
LAST_ACTIVITY_FIELD = "last_activity"
MAX_ROOM_IDLE_TIME = 3600  # example: 1 hour

SUCCESS = True
FAILURE = False

# Assume redis_client and get_room_data, get_all_room_codes, delete_room_data are defined elsewhere


def cleanup_room_if_ended(room_code: str) -> bool:
    """Check if a room's game has ended and all players are disconnected; if so, delete it."""
    if not room_code:
        return FAILURE

    room_data = get_room_data(room_code)
    if not room_data:
        return FAILURE

    if room_data.get("status") in ["completed", "failed"]:
        all_disconnected = True
        for player_id, player_data in room_data.get("players", {}).items():
            if isinstance(player_data, dict) and player_data.get("connected", False):
                all_disconnected = False
                break
            elif hasattr(player_data, "connected") and player_data.connected:
                all_disconnected = False
                break

        if all_disconnected:
            player_ids = list(room_data.get("players", {}).keys())

            with redis_client.pipeline() as pipe:
                for player_id in player_ids:
                    pipe.delete(
                        f"{PLAYER_PREFIX}{player_id}",
                        f"{PLAYER_ROOM_PREFIX}{player_id}",
                    )
                pipe.delete(
                    f"{ROOM_PREFIX}{room_code}", f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
                )
                pipe.execute()
            return SUCCESS

    return FAILURE


async def cleanup_inactive_rooms():
    """Periodically scan for and clean up inactive game rooms"""
    while True:
        try:
            room_codes = get_all_room_codes()
            current_time = int(time.time())

            for room_code in room_codes:
                room_data = get_room_data(room_code)
                if not room_data:
                    continue

                last_activity = room_data.get(LAST_ACTIVITY_FIELD, 0)
                time_inactive = current_time - last_activity

                if time_inactive > MAX_ROOM_IDLE_TIME:
                    player_ids = list(room_data.get("players", {}).keys())

                    with redis_client.pipeline() as pipe:
                        for player_id in player_ids:
                            pipe.delete(
                                f"{PLAYER_PREFIX}{player_id}",
                                f"{PLAYER_ROOM_PREFIX}{player_id}",
                            )
                        pipe.delete(
                            f"{ROOM_PREFIX}{room_code}",
                            f"{ROOM_CONNECTIONS_PREFIX}{room_code}",
                        )
                        pipe.execute()

                elif room_data.get("status") in ["completed", "failed"]:
                    cleanup_room_if_ended(room_code)

                elif room_data.get("status") == "waiting" and not room_data.get(
                    "players"
                ):
                    delete_room_data(room_code)

        except Exception as e:
            print(f"Error during cleanup: {e}")

        await asyncio.sleep(600) 


# Redis health check function that can be called periodically
def health_check() -> Dict[str, Any]:
    """Perform a health check on Redis connection"""
    try:
        start_time = time.time()
        ping_result = redis_client.ping()
        response_time = time.time() - start_time

        info = redis_client.info()

        return {
            "status": "ok" if ping_result else "error",
            "response_time_ms": round(response_time * 1000, 2),
            "connected_clients": info.get("connected_clients", 0),
            "used_memory_human": info.get("used_memory_human", "unknown"),
            "timestamp": int(time.time()),
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "timestamp": int(time.time())}
