from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = _client[settings.MONGODB_DB_NAME]
    await db.users.create_index("login", unique=True)
    await db.messages.create_index([("login", 1), ("created_at", -1)])
    await db.ai_cache.create_index([("user_id", 1), ("endpoint", 1)], unique=True)


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("MongoDB client is not initialized")
    return _client[settings.MONGODB_DB_NAME]
