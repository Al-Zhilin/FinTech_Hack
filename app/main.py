import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI

from .graph import run_graph
from .llm import OllamaClient
from .schemas import AIRequest, AIResponse

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Service", version="0.1.0")


@app.get("/health")
def health():
    client = OllamaClient(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    ollama_ok = client.health_check()
    logger.info(f"[health] ollama={'up' if ollama_ok else 'down'}")
    return {"status": "ok", "ollama": "up" if ollama_ok else "down"}



@app.post("/ai/process", response_model=AIResponse)
def process(request: AIRequest) -> AIResponse:
    logger.info(f"[/ai/process] user_id={request.user_id} mode={request.mode} query='{request.query[:80]}'")

    try:
        result = run_graph(
            user_id=request.user_id,
            query=request.query,
            context=request.context.model_dump(),
            mode=request.mode,
        )
        return AIResponse(
            text=result["text"],
            structured=result["structured"],
            sources=result["sources"],
            intent=result.get("intent", "question"),
        )
    except Exception as e:
        logger.error(f"[/ai/process] unhandled error: {e}", exc_info=True)
        return AIResponse(
            text="Произошла ошибка при обработке запроса. Попробуйте ещё раз.",
            structured={},
            sources=[],
            error=str(e),
        )
