from datetime import datetime, timezone

from app.core.database import get_db


async def get_cached(user_id: str, endpoint: str) -> dict | None:
    db = get_db()
    doc = await db.ai_cache.find_one({"user_id": user_id, "endpoint": endpoint})
    return doc["response"] if doc else None


async def set_cached(user_id: str, endpoint: str, response: dict) -> None:
    db = get_db()
    await db.ai_cache.update_one(
        {"user_id": user_id, "endpoint": endpoint},
        {"$set": {"response": response, "cached_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
