from pydantic import BaseModel
from typing import Dict, List, Optional


class Player(BaseModel):
    id: str
    name: str
    role: str
    room_code: str
    connected: bool = True
    is_host: bool = False


class GameRoom(BaseModel):
    code: str
    players: Dict[str, Player] = {}
    stage: int = 0
    alert_level: int = 0
    timer: int = 300  # 5 minutes default
    status: str = "waiting"  # waiting, in_progress, completed, failed
    puzzles: Dict = {}
    stage_completion: Dict[str, Dict[str, bool]] = {}  # Format: {stage: {player_id: True/False}}
    next_events_visible: bool = False  # Add field for Lookout power
    last_power_description: Optional[str] = None  # For storing power descriptions
    # Timer vote related fields
    timer_vote_active: bool = False
    timer_votes: Dict = {"yes": [], "no": []}
    timer_vote_initiator: Optional[str] = None
    timer_vote_time_limit: int = 20 