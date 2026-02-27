"""
NovaX — Community WebSocket Router
Real-time community chat with Redis Pub/Sub for room-based messaging.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from models.redis import get_redis
from routers.auth import decode_token

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and room subscriptions."""

    def __init__(self):
        # room_name -> set of websockets
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # websocket -> user info
        self.connections: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, room: str, user_id: str, username: str):
        """Accept connection and add to room."""
        await websocket.accept()

        if room not in self.rooms:
            self.rooms[room] = set()

        self.rooms[room].add(websocket)
        self.connections[websocket] = {
            "user_id": user_id,
            "username": username,
            "room": room,
        }

        # Broadcast join notification
        await self.broadcast(room, {
            "type": "system",
            "message": f"{username} joined the room",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    async def disconnect(self, websocket: WebSocket):
        """Remove connection from room and cleanup."""
        info = self.connections.get(websocket, {})
        room = info.get("room")
        username = info.get("username", "Unknown")

        if room and room in self.rooms:
            self.rooms[room].discard(websocket)
            if not self.rooms[room]:
                del self.rooms[room]

            # Broadcast leave notification
            await self.broadcast(room, {
                "type": "system",
                "message": f"{username} left the room",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        self.connections.pop(websocket, None)

    async def broadcast(self, room: str, message: dict):
        """Send message to all connections in a room."""
        if room not in self.rooms:
            return

        dead_connections = set()
        for ws in self.rooms[room]:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.add(ws)

        # Cleanup dead connections
        for ws in dead_connections:
            self.rooms[room].discard(ws)
            self.connections.pop(ws, None)

    def get_room_users(self, room: str) -> list:
        """Get list of users in a room."""
        if room not in self.rooms:
            return []
        return [
            self.connections[ws]
            for ws in self.rooms[room]
            if ws in self.connections
        ]


manager = ConnectionManager()


@router.websocket("/community")
async def community_websocket(
    websocket: WebSocket,
    room: str = Query("general"),
    token: str = Query(..., description="JWT access token for authentication"),
):
    """
    WebSocket endpoint for real-time community chat.
    Requires a valid JWT `token` query param.

    Message format (client → server):
    {"type": "message", "content": "Hello!"}
    {"type": "get_users"}

    Message format (server → client):
    {"type": "message", "username": "...", "content": "...", "timestamp": "..."}
    {"type": "system", "message": "...", "timestamp": "..."}
    {"type": "users", "users": [...]}
    """
    # --- JWT auth before accepting the WebSocket connection ---
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=1008, reason="Invalid token type")
            return

        # Check Redis blacklist
        redis = get_redis()
        jti = payload.get("jti")
        if jti and await redis.get(f"auth:blacklist:{jti}"):
            await websocket.close(code=1008, reason="Token revoked")
            return

        user_id: str = payload.get("sub", "anonymous")
        username: str = payload.get("username", f"user_{user_id[:6]}")
    except Exception:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    # ----------------------------------------------------------

    await manager.connect(websocket, room, user_id, username)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "message":
                content = data.get("content", "")
                if content.strip():
                    message = {
                        "type": "message",
                        "user_id": user_id,
                        "username": username,
                        "content": content,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "room": room,
                    }

                    # Broadcast to room
                    await manager.broadcast(room, message)

                    # Store in Redis for recent history
                    try:
                        redis = get_redis()
                        key = f"community:room:{room}:history"
                        await redis.lpush(key, json.dumps(message))
                        await redis.ltrim(key, 0, 99)  # Keep last 100 messages
                    except Exception:
                        pass

            elif msg_type == "get_users":
                users = manager.get_room_users(room)
                await websocket.send_json({
                    "type": "users",
                    "users": [
                        {"user_id": u["user_id"], "username": u["username"]}
                        for u in users
                    ],
                })

            elif msg_type == "get_history":
                # Fetch recent messages from Redis
                try:
                    redis = get_redis()
                    key = f"community:room:{room}:history"
                    history = await redis.lrange(key, 0, 49)
                    messages = [json.loads(m) for m in reversed(history)]
                    await websocket.send_json({
                        "type": "history",
                        "messages": messages,
                    })
                except Exception:
                    await websocket.send_json({
                        "type": "history",
                        "messages": [],
                    })

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
