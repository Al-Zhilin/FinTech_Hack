import logging
import httpx

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def generate(self, model: str, prompt: str, system: str = "") -> str:
        url = f"{self.base_url}/api/generate"
        payload: dict = {"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0}}
        if system:
            payload["system"] = system

        logger.debug(f"[llm] >>> model={model}\n--- SYSTEM ---\n{system}\n--- PROMPT ---\n{prompt}")
        try:
            with httpx.Client(timeout=120.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()["response"]
                logger.debug(f"[llm] <<< model={model}\n--- RESPONSE ---\n{result}")
                return result
        except httpx.TimeoutException:
            logger.error(f"Ollama timeout — model={model}")
            raise
        except Exception as e:
            logger.error(f"Ollama error — model={model}: {e}")
            raise

    def health_check(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                r = client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False
