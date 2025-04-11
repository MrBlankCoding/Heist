# app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import asyncio
import os
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import FileResponse
from starlette.staticfiles import StaticFiles as StarletteStaticFiles

# Import our modules correctly
from app.routes import router
from app.websocket import websocket_endpoint
from app.redis_client import cleanup_inactive_rooms, test_connection

# Create a custom StaticFiles class to add Cache-Control headers
class CachedStaticFiles(StarletteStaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if isinstance(response, FileResponse):
            # Set cache headers based on file extension
            if path.endswith(('.js', '.css')):
                # Cache JS and CSS for 1 week (604800 seconds)
                response.headers['Cache-Control'] = 'public, max-age=604800, stale-while-revalidate=86400'
            elif path.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg')):
                # Cache images for 1 month (2592000 seconds)
                response.headers['Cache-Control'] = 'public, max-age=2592000, stale-while-revalidate=86400'
            else:
                # Cache other static files for 1 day (86400 seconds)
                response.headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=3600'
        return response

app = FastAPI(title="The Heist Game")

# Add GZip compression for text-based responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Get the absolute path to the static directory
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")

# Mount static files with absolute path using custom cached static files
app.mount("/static", CachedStaticFiles(directory=static_dir), name="static")

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
