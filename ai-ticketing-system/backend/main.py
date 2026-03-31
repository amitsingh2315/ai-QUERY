"""
FastAPI Application Entry Point
Advanced AI Ticketing System — Main Server
"""

from dotenv import load_dotenv
load_dotenv()  # Load .env file (GROQ_API_KEY, etc.)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import asyncio
from typing import List

from database import engine, SessionLocal, Base
from models import *  # Import all models so they're registered
from seed_data import seed_employees
from routers import tickets, employees, analytics


# ─── WebSocket Connection Manager ────────────────────────────────────

class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.active_connections.remove(conn)


manager = ConnectionManager()


# ─── App Lifecycle ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("[Startup] Database tables created.")

    # Seed employee data
    db = SessionLocal()
    try:
        seed_employees(db)
    finally:
        db.close()

    print("[Startup] AI Ticketing System ready!")
    print("[Startup] API docs: http://localhost:8000/docs")

    yield  # App is running

    print("[Shutdown] Closing connections...")


# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title="Advanced AI Ticketing System",
    description="Smart internal ticketing platform with AI-powered analysis, auto-resolution, and intelligent routing.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(tickets.router)
app.include_router(employees.router)
app.include_router(analytics.router)


# ─── WebSocket Endpoint ──────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time ticket updates."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or handle client messages
            await websocket.send_json({"type": "ack", "message": "received"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Health Check ─────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Ticketing System",
        "version": "1.0.0",
    }


# Expose manager for use in routers
app.state.ws_manager = manager


# ─── Run Server ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
