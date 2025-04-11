# app/main.py
from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import HTTPException
import time
import asyncio
import logging
import os
from starlette.responses import FileResponse, JSONResponse
from starlette.staticfiles import StaticFiles as StarletteStaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv

# Import our modules correctly
from app.routes import router
from app.websocket import websocket_endpoint
from app.redis_client import cleanup_inactive_rooms, test_connection, health_check
from app.utils import get_environment_variable, get_boolean_env

# Load environment variables
load_dotenv()

# Get environment variables
ENVIRONMENT = get_environment_variable("ENVIRONMENT", "development")
DEBUG = get_boolean_env("DEBUG", False)
LOG_LEVEL = get_environment_variable("LOG_LEVEL", "INFO")
ALLOWED_HOST = get_environment_variable("ALLOWED_HOST", "localhost")
CORS_ORIGINS = get_environment_variable("CORS_ORIGINS", "*").split(",")

# Configure logging
log_level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("app.main")

# Request timing middleware
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response

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
            elif path.endswith(('.woff', '.woff2', '.ttf', '.eot')):
                # Cache fonts for 1 year (31536000 seconds)
                response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            else:
                # Cache other static files for 1 day (86400 seconds)
                response.headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=3600'
        return response

# Custom error handler
async def generic_error_handler(request, exc):
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. This has been logged."}
    )

# Create FastAPI app with metadata
app = FastAPI(
    title="The Heist Game",
    description="A multiplayer cooperative game where players work together to complete a virtual heist against the clock.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression for text-based responses
app.add_middleware(
    GZipMiddleware, 
    minimum_size=1000,
    compresslevel=6
)

# Add request timing middleware
app.add_middleware(TimingMiddleware)

# Add trusted host middleware if in production
if ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=[ALLOWED_HOST]
    )

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

# Health check endpoint
@app.get("/health")
async def health():
    redis_status = health_check()
    return {
        "status": "ok",
        "uptime": time.time() - app_start_time,
        "environment": ENVIRONMENT,
        "redis": redis_status
    }

# Track app start time for uptime monitoring
app_start_time = time.time()

# Test Redis connection on startup
@app.on_event("startup")
async def startup_event():
    logger.info(f"Application starting up in {ENVIRONMENT} environment")
    
    # Test Redis connection
    if not test_connection():
        logger.warning("Redis connection test failed!")
    else:
        logger.info("Redis connection successful!")
    
    # Start background cleanup task
    asyncio.create_task(cleanup_inactive_rooms())
    logger.info("Started background cleanup task for inactive game rooms")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
    # Perform any cleanup here if needed

# Add custom exception handler
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    return await generic_error_handler(request, exc)

# Add custom 404 handler
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    if exc.status_code == 404:
        return templates_instance.TemplateResponse(
            "error.html", 
            {
                "request": request, 
                "message": "Page not found",
                "status_code": 404,
                "debug": DEBUG
            }
        )
    return await http_exception_handler(request, exc)
