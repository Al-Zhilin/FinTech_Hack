import asyncio
import logging

import httpx

from app.core.cache import set_cached
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
_REFRESH_INTERVAL = 3600  # 1 час


async def refresh_user_cache(user_id: str) -> None:
    """Обновить кеш daily-action и patterns для одного пользователя."""
    async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_TIMEOUT, trust_env=False) as client:
        try:
            r = await client.get(f"{settings.AI_SERVICE_URL}/ai/daily-action/{user_id}")
            r.raise_for_status()
            await set_cached(user_id, "daily_action", r.json())
        except Exception as e:
            logger.warning("Cache refresh daily_action failed for %s: %s", user_id, e)

        try:
            r = await client.get(f"{settings.AI_SERVICE_URL}/ai/patterns/{user_id}")
            r.raise_for_status()
            await set_cached(user_id, "patterns", r.json())
        except Exception as e:
            logger.warning("Cache refresh patterns failed for %s: %s", user_id, e)


async def _refresh_all() -> None:
    db = get_db()
    users = await db.users.find({}, {"login": 1}).to_list(length=None)
    for user in users:
        login = user.get("login")
        if login:
            await refresh_user_cache(login)
            await asyncio.sleep(1)  # не перегружаем AI-сервер


async def run_scheduler() -> None:
    await asyncio.sleep(5)  # даём время на запуск приложения
    logger.info("AI cache: initial refresh started")
    await _refresh_all()
    logger.info("AI cache: initial refresh done")

    while True:
        await asyncio.sleep(_REFRESH_INTERVAL)
        logger.info("AI cache: scheduled refresh started")
        await _refresh_all()
        logger.info("AI cache: scheduled refresh done")
