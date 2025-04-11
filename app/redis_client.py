import json
import redis
import os
import time
import asyncio
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Redis URI from environment variable
REDIS_URI = os.getenv("REDIS_URI")

if not REDIS_URI:
    raise EnvironmentError("REDIS_URI environment variable is not set")

# Initialize Redis client using the URI from .env
redis_client = redis.from_url(REDIS_URI, decode_responses=True)

# Key prefixes
ROOM_PREFIX = "room:"
PLAYER_PREFIX = "player:"
PLAYER_ROOM_PREFIX = "player_room:"

# Define maximum inactive time for rooms (in seconds)
MAX_ROOM_IDLE_TIME = 3600  # 1 hour
LAST_ACTIVITY_FIELD = "last_activity"

def store_room_data(room_code: str, room_data: Dict) -> bool:
    """Store room data in Redis"""
    try:
        # Add last activity timestamp
        room_data[LAST_ACTIVITY_FIELD] = int(time.time())
        
        key = f"{ROOM_PREFIX}{room_code}"
        redis_client.set(key, json.dumps(room_data))
        return True
    except Exception as e:
        print(f"Error storing room data: {e}")
        return False

def get_room_data(room_code: str) -> Optional[Dict]:
    """Get room data from Redis"""
    try:
        key = f"{ROOM_PREFIX}{room_code}"
        data = redis_client.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception as e:
        print(f"Error getting room data: {e}")
        return None

def get_all_room_codes() -> List[str]:
    """Get all room codes stored in Redis"""
    try:
        keys = redis_client.keys(f"{ROOM_PREFIX}*")
        return [key.replace(ROOM_PREFIX, "") for key in keys]
    except Exception as e:
        print(f"Error getting all room codes: {e}")
        return []

def store_player_data(player_id: str, player_data: Dict) -> bool:
    """Store player data in Redis"""
    try:
        key = f"{PLAYER_PREFIX}{player_id}"
        redis_client.set(key, json.dumps(player_data))
        return True
    except Exception as e:
        print(f"Error storing player data: {e}")
        return False

def get_player_data(player_id: str) -> Optional[Dict]:
    """Get player data from Redis"""
    try:
        key = f"{PLAYER_PREFIX}{player_id}"
        data = redis_client.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception as e:
        print(f"Error getting player data: {e}")
        return None

def associate_player_with_room(player_id: str, room_code: str) -> bool:
    """Associate player with room for quick lookup"""
    try:
        key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        redis_client.set(key, room_code)
        return True
    except Exception as e:
        print(f"Error associating player with room: {e}")
        return False

def get_player_room(player_id: str) -> Optional[str]:
    """Get room code for a player"""
    try:
        key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        return redis_client.get(key)
    except Exception as e:
        print(f"Error getting player room: {e}")
        return None

def delete_player_data(player_id: str) -> bool:
    """Delete player data from Redis"""
    try:
        player_key = f"{PLAYER_PREFIX}{player_id}"
        room_key = f"{PLAYER_ROOM_PREFIX}{player_id}"
        redis_client.delete(player_key, room_key)
        return True
    except Exception as e:
        print(f"Error deleting player data: {e}")
        return False

def delete_room_data(room_code: str) -> bool:
    """Delete room data from Redis"""
    try:
        key = f"{ROOM_PREFIX}{room_code}"
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Error deleting room data: {e}")
        return False

def get_players_in_room(room_code: str) -> List[str]:
    """Get list of player IDs in a room"""
    try:
        # Get room data
        room_data = get_room_data(room_code)
        if not room_data or not room_data.get("players"):
            return []
        
        # Return list of player IDs
        return list(room_data["players"].keys())
    except Exception as e:
        print(f"Error getting players in room: {e}")
        return []

def cleanup_player_data(player_id: str) -> bool:
    """Clean up all player data when leaving a game"""
    try:
        # First get the room this player belongs to
        room_code = get_player_room(player_id)
        if room_code:
            # Get room data
            room_data = get_room_data(room_code)
            if room_data and "players" in room_data and player_id in room_data["players"]:
                # Log player leaving
                player_data = room_data["players"].get(player_id, {})
                player_name = player_data.get("name", "Unknown player") if isinstance(player_data, dict) else getattr(player_data, "name", "Unknown player")
                print(f"Player {player_name} ({player_id}) manually left room {room_code}")
                
                # Remove player from the room's player list
                del room_data["players"][player_id]
                
                # Update the room data
                store_room_data(room_code, room_data)
                
                # Check if the room is now empty
                if not room_data["players"]:
                    # If room is empty, delete the room
                    delete_room_data(room_code)
                    print(f"Room {room_code} deleted - no more players")
                elif room_data.get("status") in ["completed", "failed"]:
                    # If the game has ended, check if all players have disconnected
                    all_disconnected = True
                    for player_data in room_data["players"].values():
                        if isinstance(player_data, dict) and player_data.get("connected", False):
                            all_disconnected = False
                            break
                        elif hasattr(player_data, "connected") and player_data.connected:
                            all_disconnected = False
                            break
                    
                    if all_disconnected:
                        # All players have disconnected and the game is over, delete the room
                        delete_room_data(room_code)
                        print(f"Room {room_code} deleted - game over and all players disconnected")
        
        # Now delete the player data
        delete_player_data(player_id)
        return True
    except Exception as e:
        print(f"Error cleaning up player data: {e}")
        return False

def cleanup_room_if_ended(room_code: str) -> bool:
    """Check if a room's game has ended and all players disconnected, if so delete it"""
    try:
        room_data = get_room_data(room_code)
        if not room_data:
            return False
            
        # Check if game is over
        if room_data.get("status") in ["completed", "failed"]:
            # Check if all players are disconnected
            all_disconnected = True
            for player_id, player_data in room_data.get("players", {}).items():
                if isinstance(player_data, dict) and player_data.get("connected", False):
                    all_disconnected = False
                    break
                elif hasattr(player_data, "connected") and player_data.connected:
                    all_disconnected = False
                    break
            
            if all_disconnected:
                # Delete all player associations with this room
                for player_id in room_data.get("players", {}).keys():
                    delete_player_data(player_id)
                    
                # Delete the room
                delete_room_data(room_code)
                print(f"Room {room_code} deleted during cleanup - game over and all players disconnected")
                return True
    except Exception as e:
        print(f"Error in cleanup_room_if_ended: {e}")
    
    return False

async def cleanup_inactive_rooms():
    """Periodically scan for and clean up inactive game rooms"""
    while True:
        try:
            # Get all room codes
            room_codes = get_all_room_codes()
            
            # Current time
            current_time = int(time.time())
            
            for room_code in room_codes:
                # Get room data
                room_data = get_room_data(room_code)
                if not room_data:
                    continue
                
                # Check if the room has been inactive
                last_activity = room_data.get(LAST_ACTIVITY_FIELD, 0)
                time_inactive = current_time - last_activity
                
                if time_inactive > MAX_ROOM_IDLE_TIME:
                    print(f"Room {room_code} inactive for {time_inactive} seconds, cleaning up")
                    
                    # Delete all player associations with this room
                    for player_id in room_data.get("players", {}).keys():
                        delete_player_data(player_id)
                    
                    # Delete the room
                    delete_room_data(room_code)
                    print(f"Room {room_code} deleted - inactive for too long")
                    
                # For ended games, check if all players are disconnected
                elif room_data.get("status") in ["completed", "failed"]:
                    cleanup_room_if_ended(room_code)
                    
                # For waiting games with no players, clean up
                elif (room_data.get("status") == "waiting" and 
                      (not room_data.get("players") or len(room_data.get("players", {})) == 0)):
                    delete_room_data(room_code)
                    print(f"Room {room_code} deleted - waiting with no players")
                    
        except Exception as e:
            print(f"Error during inactive room cleanup: {e}")
        
        # Run every 10 minutes
        await asyncio.sleep(600)

def test_connection() -> bool:
    """Test the Redis connection"""
    try:
        # Try to ping Redis
        redis_client.ping()
        return True
    except Exception as e:
        print(f"Redis connection test failed: {e}")
        return False 