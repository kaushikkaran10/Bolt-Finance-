"""
NovaX — Redis Connection Manager
Handles connection lifecycle and provides a global client.
"""

import redis.asyncio as aioredis

from config import get_settings

settings = get_settings()

redis_client: aioredis.Redis | None = None


async def init_redis():
    """Initialize Redis async connection."""
    global redis_client
    redis_client = aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    await redis_client.ping()
    print("  ✅ Redis connected")


async def close_redis():
    """Close Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
    print("  🛑 Redis connection closed")


def get_redis() -> aioredis.Redis:
    """Dependency: returns the Redis client."""
    if redis_client is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return redis_client
