import json
import redis
import os
import time
import asyncio
from redis.retry import Retry
from redis.backoff import ExponentialBackoff
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Redis configuration
REDIS_URI = os.getenv("REDIS_URI")
if not REDIS_URI:
    raise EnvironmentError("REDIS_URI environment variable is not set")

REDIS_POOL_SIZE = int(os.getenv("REDIS_POOL_SIZE", "10"))
REDIS_SOCKET_TIMEOUT = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
REDIS_RETRY_MAX_ATTEMPTS = int(os.getenv("REDIS_RETRY_MAX_ATTEMPTS", "3"))

# Key prefixes
ROOM_PREFIX = "room:"
PLAYER_PREFIX = "player:"
PLAYER_ROOM_PREFIX = "player_room:"
CONNECTION_PREFIX = "connection:"
ROOM_CONNECTIONS_PREFIX = "room_connections:"

# TTL and timing settings
MAX_ROOM_IDLE_TIME = int(os.getenv("MAX_ROOM_IDLE_TIME", "3600"))  # 1 hour by default
ROOM_DATA_TTL = int(os.getenv("ROOM_DATA_TTL", "86400"))  # 24 hours
PLAYER_DATA_TTL = int(os.getenv("PLAYER_DATA_TTL", "43200"))  # 12 hours

# Game settings
DEFAULT_GAME_TIMER = int(os.getenv("DEFAULT_GAME_TIMER", "300"))
DEFAULT_VOTE_TIME_LIMIT = int(os.getenv("DEFAULT_VOTE_TIME_LIMIT", "20"))

# Fields
LAST_ACTIVITY_FIELD = "last_activity"

# Return codes
SUCCESS = True
FAILURE = False

# Initialize Redis client
redis_retry = Retry(ExponentialBackoff(), REDIS_RETRY_MAX_ATTEMPTS)
redis_client = redis.from_url(
    REDIS_URI,
    decode_responses=True,
    socket_timeout=REDIS_SOCKET_TIMEOUT,
    socket_keepalive=True,
    health_check_interval=30,
    retry=redis_retry,
    max_connections=REDIS_POOL_SIZE,
)


def store_room_data(room_code: str, room_data: Dict) -> bool:
    if not room_code or not room_data:
        return FAILURE

    try:
        room_data[LAST_ACTIVITY_FIELD] = int(time.time())
        key = f"{ROOM_PREFIX}{room_code}"
        serialized_data = json.dumps(room_data)

        with redis_client.pipeline() as pipe:
            pipe.set(key, serialized_data)
            pipe.expire(key, ROOM_DATA_TTL)
            pipe.execute()

        return SUCCESS
    except (redis.RedisError, Exception):
        return FAILURE


def get_room_data(room_code: str) -> Optional[Dict]:
    if not room_code:
        return None

    try:
        key = f"{ROOM_PREFIX}{room_code}"
        data = redis_client.get(key)
        if data:
            redis_client.expire(key, ROOM_DATA_TTL)
            return json.loads(data)
        return None
    except (json.JSONDecodeError, redis.RedisError, Exception):
        return None


def get_all_room_codes() -> List[str]:
    try:
        keys = redis_client.keys(f"{ROOM_PREFIX}*")
        return [key.replace(ROOM_PREFIX, "") for key in keys]
    except (redis.RedisError, Exception):
        return []


def store_player_data(player_id: str, player_data: Dict) -> bool:
    if not player_id or not player_data:
        return FAILURE

    try:
        key = f"{PLAYER_PREFIX}{player_id}"
        serialized_data = json.dumps(player_data)

        with redis_client.pipeline() as pipe:
            pipe.set(key, serialized_data)
            pipe.expire(key, PLAYER_DATA_TTL)
            pipe.execute()

        return SUCCESS
    except (redis.RedisError, Exception):
        return FAILURE


def get_player_data(player_id: str) -> Optional[Dict]:
    if not player_id:
        return None

    try:
        key = f"{PLAYER_PREFIX}{player_id}"
        data = redis_client.get(key)
        if data:
            redis_client.expire(key, PLAYER_DATA_TTL)
            return json.loads(data)
        return None
    except (json.JSONDecodeError, redis.RedisError, Exception):
        return None


def associate_player_with_room(player_id: str, room_code: str) -> bool:
    if not player_id or not room_code:
        return FAILURE

    try:
        key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"

        with redis_client.pipeline() as pipe:
            pipe.set(key, room_code)
            pipe.expire(key, PLAYER_DATA_TTL)
            pipe.sadd(room_connections_key, player_id)
            pipe.expire(room_connections_key, ROOM_DATA_TTL)
            pipe.execute()

        return SUCCESS
    except (redis.RedisError, Exception):
        return FAILURE


def get_player_room(player_id: str) -> Optional[str]:
    if not player_id:
        return None

    try:
        key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        room_code = redis_client.get(key)

        if room_code:
            redis_client.expire(key, PLAYER_DATA_TTL)

        return room_code
    except (redis.RedisError, Exception):
        return None


def mark_player_connection_status(player_id: str, connected: bool) -> bool:
    if not player_id:
        return FAILURE

    try:
        player_data = get_player_data(player_id)
        if not player_data:
            return FAILURE

        player_data["connected"] = connected
        if connected:
            player_data["last_connected"] = int(time.time())

        return store_player_data(player_id, player_data)
    except Exception:
        return FAILURE


def get_players_in_room(room_code: str) -> List[str]:
    if not room_code:
        return []

    try:
        room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
        player_ids = redis_client.smembers(room_connections_key)

        if player_ids:
            redis_client.expire(room_connections_key, ROOM_DATA_TTL)
            return list(player_ids)

        room_data = get_room_data(room_code)
        if not room_data or not room_data.get("players"):
            return []

        player_ids = list(room_data["players"].keys())

        if player_ids:
            with redis_client.pipeline() as pipe:
                pipe.sadd(room_connections_key, *player_ids)
                pipe.expire(room_connections_key, ROOM_DATA_TTL)
                pipe.execute()

        return player_ids
    except (redis.RedisError, Exception):
        return []


def get_connected_players_in_room(room_code: str) -> List[str]:
    if not room_code:
        return []

    try:
        player_ids = get_players_in_room(room_code)
        connected_players = []

        for player_id in player_ids:
            player_data = get_player_data(player_id)
            if player_data and player_data.get("connected", False):
                connected_players.append(player_id)

        return connected_players
    except Exception:
        return []


def delete_player_data(player_id: str) -> bool:
    if not player_id:
        return FAILURE

    try:
        room_code = get_player_room(player_id)
        player_key = f"{PLAYER_PREFIX}{player_id}"
        room_key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        connection_key = f"{CONNECTION_PREFIX}{player_id}"

        with redis_client.pipeline() as pipe:
            pipe.delete(player_key, room_key, connection_key)

            if room_code:
                room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"
                pipe.srem(room_connections_key, player_id)

            pipe.execute()

        return SUCCESS
    except (redis.RedisError, Exception):
        return FAILURE


def delete_room_data(room_code: str) -> bool:
    if not room_code:
        return FAILURE

    try:
        player_ids = get_players_in_room(room_code)
        room_key = f"{ROOM_PREFIX}{room_code}"
        room_connections_key = f"{ROOM_CONNECTIONS_PREFIX}{room_code}"

        with redis_client.pipeline() as pipe:
            pipe.delete(room_key, room_connections_key)

            for player_id in player_ids:
                player_room_key = f"{PLAYER_ROOM_PREFIX}{player_id}"
                pipe.delete(player_room_key)

            pipe.execute()

        return SUCCESS
    except (redis.RedisError, Exception):
        return FAILURE


def cleanup_room_if_ended(room_code: str) -> bool:
    if not room_code:
        return FAILURE

    room_data = get_room_data(room_code)
    if not room_data:
        return FAILURE

    if room_data.get("status") in ["completed", "failed"]:
        all_disconnected = True
        
        for player_data in room_data.get("players", {}).values():
            is_connected = False
            if isinstance(player_data, dict):
                is_connected = player_data.get("connected", False)
            elif hasattr(player_data, "connected"):
                is_connected = player_data.connected
                
            if is_connected:
                all_disconnected = False
                break

        if all_disconnected:
            player_ids = list(room_data.get("players", {}).keys())

            with redis_client.pipeline() as pipe:
                for player_id in player_ids:
                    pipe.delete(f"{PLAYER_PREFIX}{player_id}", f"{PLAYER_ROOM_PREFIX}{player_id}")
                pipe.delete(f"{ROOM_PREFIX}{room_code}", f"{ROOM_CONNECTIONS_PREFIX}{room_code}")
                pipe.execute()
            return SUCCESS

    return FAILURE


def cleanup_player_data(player_id: str) -> bool:
    if not player_id:
        return FAILURE

    try:
        room_code = get_player_room(player_id)
        if room_code:
            room_data = get_room_data(room_code)
            if room_data and "players" in room_data and player_id in room_data["players"]:
                del room_data["players"][player_id]
                store_room_data(room_code, room_data)

                if not room_data["players"]:
                    delete_room_data(room_code)
                elif room_data.get("status") in ["completed", "failed"]:
                    cleanup_room_if_ended(room_code)

        delete_player_data(player_id)
        return SUCCESS
    except (redis.RedisError, Exception):
        return FAILURE


async def cleanup_inactive_rooms():
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
                            pipe.delete(f"{PLAYER_PREFIX}{player_id}", f"{PLAYER_ROOM_PREFIX}{player_id}")
                        pipe.delete(f"{ROOM_PREFIX}{room_code}", f"{ROOM_CONNECTIONS_PREFIX}{room_code}")
                        pipe.execute()
                elif room_data.get("status") in ["completed", "failed"]:
                    cleanup_room_if_ended(room_code)
                elif room_data.get("status") == "waiting" and not room_data.get("players"):
                    delete_room_data(room_code)

        except Exception as e:
            print(f"Error during cleanup: {e}")

        await asyncio.sleep(600)


def test_connection() -> bool:
    try:
        redis_client.ping()
        return SUCCESS
    except (redis.RedisError, Exception) as e:
        print(f"Redis connection test failed: {e}")
        return FAILURE


def health_check() -> Dict[str, Any]:
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