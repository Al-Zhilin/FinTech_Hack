import asyncio
import logging

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(3)
_waiting: int = 0
_processing: int = 0


async def acquire(label: str = "") -> None:
    global _waiting, _processing
    _waiting += 1
    logger.info(f"[queue] waiting (position ~{_waiting}) — {label}")
    await _semaphore.acquire()
    _waiting -= 1
    _processing += 1
    logger.info(f"[queue] processing ({_processing}/3) — {label}")


def release(label: str = "") -> None:
    global _processing
    _processing = max(0, _processing - 1)
    _semaphore.release()
    logger.info(f"[queue] done ({_processing}/3) — {label}")


def get_status() -> dict:
    return {"queue_size": _waiting, "processing": _processing > 0, "processing_count": _processing, "max_parallel": 3}
