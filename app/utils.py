import random
import json
import asyncio
from typing import Dict

# Global storage (would use a database in production)
game_rooms = {}
connected_players = {}

def generate_room_code() -> str:
    """Generate a unique 4-character room code"""
    while True:
        code = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=4))
        if code not in game_rooms:
            return code


async def broadcast_to_room(room_code: str, message: Dict):
    """Broadcast a message to all players in a room"""
    if room_code not in game_rooms:
        return

    room = game_rooms[room_code]
    message_json = json.dumps(message)

    for player_id in room.players:
        if player_id in connected_players:
            await connected_players[player_id].send_text(message_json) 