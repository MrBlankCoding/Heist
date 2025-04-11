# app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Import our modules correctly
from app.routes import router
from app.websocket import websocket_endpoint

app = FastAPI(title="The Heist Game")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates_instance = Jinja2Templates(directory="templates")

# Set templates in routes - correctly reference the module
import sys
sys.modules['app.routes'].templates = templates_instance

# Include API routes
app.include_router(router)

# Add WebSocket endpoint - correct method is app.websocket
app.websocket("/ws/{room_code}/{player_id}")(websocket_endpoint)
