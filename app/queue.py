import asyncio
import logging

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(1)
_waiting: int = 0
_processing: bool = False


async def acquire(label: str = "") -> None:
    global _waiting, _processing
    _waiting += 1
    logger.info(f"[queue] waiting (position ~{_waiting}) — {label}")
    await _semaphore.acquire()
    _waiting -= 1
    _processing = True
    logger.info(f"[queue] processing — {label}")


def release(label: str = "") -> None:
    global _processing
    _processing = False
    _semaphore.release()
    logger.info(f"[queue] done — {label}")


def get_status() -> dict:
    return {"queue_size": _waiting, "processing": _processing}
