"""
NovaX — MongoDB Connection Manager (Motor async driver)
Used for storing news articles + sentiment data.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import get_settings

settings = get_settings()

mongo_client: AsyncIOMotorClient | None = None
mongo_db: AsyncIOMotorDatabase | None = None


async def init_mongo():
    """Initialize MongoDB async connection."""
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.mongodb_url)
    mongo_db = mongo_client[settings.mongodb_db_name]

    # Create indexes for efficient queries
    news_collection = mongo_db["news_articles"]
    await news_collection.create_index("published_at")
    await news_collection.create_index("sentiment")
    await news_collection.create_index("impact")

    print("  ✅ MongoDB connected")


async def close_mongo():
    """Close MongoDB connection."""
    global mongo_client, mongo_db
    if mongo_client:
        mongo_client.close()
        mongo_client = None
        mongo_db = None
    print("  🛑 MongoDB connection closed")


def get_mongo_db() -> AsyncIOMotorDatabase:
    """Dependency: returns the MongoDB database."""
    if mongo_db is None:
        raise RuntimeError("MongoDB not initialized. Call init_mongo() first.")
    return mongo_db
