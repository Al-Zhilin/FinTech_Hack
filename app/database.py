import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)

# In-memory fallback when MongoDB is unavailable
_mem_messages: dict[str, list[dict]] = {}
_mem_profiles: dict[str, dict] = {}

_client = None
_db = None
_failed_at: float = 0.0
_RETRY_INTERVAL = 60.0  # retry MongoDB connection at most once per minute


def _get_db():
    global _client, _db, _failed_at
    if _db is not None:
        return _db
    if _failed_at and (time.monotonic() - _failed_at) < _RETRY_INTERVAL:
        return None  # still in cooldown, skip Atlas attempt
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    try:
        from pymongo import MongoClient
        _client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        _client.admin.command("ping")
        _db = _client["fintech_hack"]
        _failed_at = 0.0
        logger.info("[db] MongoDB connected")
        return _db
    except Exception as e:
        _failed_at = time.monotonic()
        _client = None
        logger.warning(f"[db] MongoDB unavailable, using in-memory fallback: {e}")
        return None


def save_onboarding_message(user_id: str, role: str, text: str, phase: int, extracted: dict | None = None) -> None:
    entry: dict = {"role": role, "text": text, "phase": phase}
    if extracted:
        entry["extracted"] = extracted
    db = _get_db()
    if db is not None:
        try:
            db["onboarding_sessions"].update_one(
                {"user_id": user_id},
                {"$push": {"messages": entry}},
                upsert=True,
            )
            return
        except Exception as e:
            logger.error(f"[db] save_onboarding_message failed: {e}")
    _mem_messages.setdefault(user_id, []).append(entry)


def get_onboarding_history(user_id: str) -> list[dict]:
    db = _get_db()
    if db is not None:
        try:
            doc = db["onboarding_sessions"].find_one({"user_id": user_id})
            return doc.get("messages", []) if doc else []
        except Exception as e:
            logger.error(f"[db] get_onboarding_history failed: {e}")
    return _mem_messages.get(user_id, [])


def save_user_profile(user_id: str, profile: dict[str, Any]) -> None:
    db = _get_db()
    if db is not None:
        try:
            db["user_profiles"].replace_one(
                {"user_id": user_id},
                {"user_id": user_id, **profile},
                upsert=True,
            )
            return
        except Exception as e:
            logger.error(f"[db] save_user_profile failed: {e}")
    _mem_profiles[user_id] = profile


def get_user_profile(user_id: str) -> dict[str, Any] | None:
    db = _get_db()
    if db is not None:
        try:
            doc = db["user_profiles"].find_one({"user_id": user_id})
            if doc:
                doc.pop("_id", None)
                return doc
            return None
        except Exception as e:
            logger.error(f"[db] get_user_profile failed: {e}")
    return _mem_profiles.get(user_id)
