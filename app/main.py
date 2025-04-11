# app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import asyncio
import os

# Import our modules correctly
from app.routes import router
from app.websocket import websocket_endpoint
from app.redis_client import cleanup_inactive_rooms, test_connection

app = FastAPI(title="The Heist Game")

# Get the absolute path to the static directory
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

# Mount static files with absolute path
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Set up templates with absolute path
templates_instance = Jinja2Templates(directory=templates_dir)

# Set templates in routes - correctly reference the module
import sys
sys.modules['app.routes'].templates = templates_instance

# Include API routes
app.include_router(router)

# Add WebSocket endpoint - correct method is app.websocket
app.websocket("/ws/{room_code}/{player_id}")(websocket_endpoint)

# Test Redis connection on startup
@app.on_event("startup")
async def startup_event():
    # Test Redis connection
    if not test_connection():
        print("WARNING: Redis connection test failed!")
    else:
        print("Redis connection successful!")
    
    # Start background cleanup task
    asyncio.create_task(cleanup_inactive_rooms())
    print("Started background cleanup task for inactive game rooms")
