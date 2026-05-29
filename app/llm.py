import logging
import re
import time

import httpx

logger = logging.getLogger(__name__)

_RETRY_ATTEMPTS = 2
_RETRY_DELAY = 1.0


def _normalize(text: str) -> str:
    return re.sub(r"(.)\1{3,}", r"\1\1\1", text)


class OllamaClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def generate(self, model: str, prompt: str, system: str = "") -> str:
        url = f"{self.base_url}/api/generate"
        payload: dict = {
            "model": model,
            "prompt": _normalize(prompt),
            "stream": False,
            "options": {"temperature": 0},
        }
        if system:
            payload["system"] = _normalize(system)

        logger.debug(f"[llm] >>> model={model}\n--- SYSTEM ---\n{system}\n--- PROMPT ---\n{prompt}")

        last_exc: Exception | None = None
        for attempt in range(1, _RETRY_ATTEMPTS + 2):  # 1 initial + 2 retries
            try:
                with httpx.Client(timeout=120.0) as client:
                    response = client.post(url, json=payload)
                    if response.status_code == 500 and attempt <= _RETRY_ATTEMPTS:
                        logger.warning(f"[llm] Ollama 500 on attempt {attempt}, retrying in {_RETRY_DELAY}s")
                        time.sleep(_RETRY_DELAY)
                        continue
                    response.raise_for_status()
                    result = response.json()["response"]
                    logger.debug(f"[llm] <<< model={model}\n--- RESPONSE ---\n{result}")
                    return result
            except httpx.TimeoutException:
                logger.error(f"Ollama timeout — model={model}")
                raise
            except httpx.HTTPStatusError as e:
                last_exc = e
                if e.response.status_code == 500 and attempt <= _RETRY_ATTEMPTS:
                    logger.warning(f"[llm] Ollama 500 on attempt {attempt}, retrying in {_RETRY_DELAY}s")
                    time.sleep(_RETRY_DELAY)
                    continue
                logger.error(f"Ollama error — model={model}: {e}")
                raise
            except Exception as e:
                logger.error(f"Ollama error — model={model}: {e}")
                raise

        logger.error(f"[llm] Ollama 500 after {_RETRY_ATTEMPTS} retries — model={model}")
        raise last_exc

    def health_check(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                r = client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False
