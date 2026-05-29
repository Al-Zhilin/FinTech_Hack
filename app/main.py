import asyncio
import json
import logging
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .database import _get_db, get_onboarding_history, get_user_profile
from .graph import AgentState, node_analyst, node_planner, node_search, run_graph
from .llm import OllamaClient
from .onboarding import process_onboarding
from .queue import acquire, get_status, release
from .schemas import AIRequest, AIResponse

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Service", version="0.1.0")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _initial_state(request: AIRequest) -> AgentState:
    return {
        "user_id": request.user_id,
        "query": request.query,
        "context": request.context.model_dump(),
        "mode": request.mode,
        "intent": "question",
        "needs_search": False,
        "search_query": None,
        "search_results": [],
        "sources": [],
        "answer_text": "",
        "structured": {},
        "error": None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    client = OllamaClient(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    ollama_ok = client.health_check()

    mongo_status = "disabled"
    if os.getenv("MONGODB_URI"):
        try:
            db = _get_db()
            mongo_status = "up" if db is not None else "down"
        except Exception:
            mongo_status = "down"

    logger.info(f"[health] ollama={'up' if ollama_ok else 'down'} mongo={mongo_status}")
    return {"status": "ok", "ollama": "up" if ollama_ok else "down", "mongo": mongo_status}


@app.post("/ai/process", response_model=AIResponse)
async def process(request: AIRequest) -> AIResponse:
    logger.info(f"[/ai/process] user_id={request.user_id} query='{request.query[:80]}'")
    await acquire(f"process user={request.user_id}")
    try:
        result = await asyncio.to_thread(
            run_graph,
            request.user_id,
            request.query,
            request.context.model_dump(),
            request.mode,
        )
        return AIResponse(
            text=result["text"],
            structured=result["structured"],
            sources=result["sources"],
            intent=result.get("intent", "question"),
        )
    except Exception as e:
        logger.error(f"[/ai/process] error: {e}", exc_info=True)
        return AIResponse(
            text="Произошла ошибка при обработке запроса. Попробуйте ещё раз.",
            structured={},
            sources=[],
            error=str(e),
        )
    finally:
        release(f"process user={request.user_id}")


@app.post("/ai/stream")
async def stream(request: AIRequest):
    logger.info(f"[/ai/stream] user_id={request.user_id} query='{request.query[:80]}'")

    async def generate():
        yield _sse("status", {"status": "queued", "message": "Запрос в очереди..."})

        await acquire(f"stream user={request.user_id}")
        try:
            yield _sse("status", {"status": "processing", "message": "Запрос обрабатывается..."})

            state = _initial_state(request)
            state = await asyncio.to_thread(node_planner, state)

            if state.get("needs_search"):
                yield _sse("status", {"status": "searching", "message": "Ищу информацию..."})
                state = await asyncio.to_thread(node_search, state)

            yield _sse("status", {"status": "analyzing", "message": "Анализирую данные..."})
            state = await asyncio.to_thread(node_analyst, state)

            yield _sse("result", {
                "text": state.get("answer_text", ""),
                "structured": state.get("structured", {}),
                "sources": state.get("sources", []),
                "intent": state.get("intent", "question"),
                "error": state.get("error"),
            })

        except Exception as e:
            logger.error(f"[/ai/stream] error: {e}", exc_info=True)
            yield _sse("result", {
                "text": "Произошла ошибка при обработке запроса.",
                "structured": {},
                "sources": [],
                "intent": "question",
                "error": str(e),
            })
        finally:
            release(f"stream user={request.user_id}")

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/ai/queue/status")
def queue_status():
    return get_status()


class OnboardingRequest(BaseModel):
    user_id: str
    message: str


@app.post("/ai/onboarding")
async def onboarding(request: OnboardingRequest):
    logger.info(f"[/ai/onboarding] user_id={request.user_id} message='{request.message[:80]}'")
    await acquire(f"onboarding user={request.user_id}")
    try:
        history = get_onboarding_history(request.user_id)
        result = await process_onboarding(
            user_id=request.user_id,
            user_message=request.message,
            history=history,
        )
        return {
            "question": result["next_question"],
            "phase": result["phase"],
            "complete": result["onboarding_complete"],
            "profile_summary": result.get("profile_summary"),
        }
    except Exception as e:
        logger.error(f"[/ai/onboarding] error: {e}", exc_info=True)
        return {
            "question": "Расскажите немного о себе — чем занимаетесь?",
            "phase": 1,
            "complete": False,
            "profile_summary": None,
            "error": str(e),
        }
    finally:
        release(f"onboarding user={request.user_id}")


@app.get("/ai/onboarding/{user_id}/status")
def onboarding_status(user_id: str):
    try:
        profile = get_user_profile(user_id)
        if profile:
            meta = profile.get("meta", {})
            return {
                "complete": meta.get("onboarding_complete", False),
                "phase": meta.get("phase", 1),
                "profile": profile,
            }
        history = get_onboarding_history(user_id)
        current_phase = 1
        if history:
            phases = [m.get("phase", 1) for m in history]
            current_phase = max(phases)
        return {"complete": False, "phase": current_phase, "profile": None}
    except Exception as e:
        logger.error(f"[/ai/onboarding/status] error: {e}", exc_info=True)
        return {"complete": False, "phase": 1, "profile": None, "error": str(e)}
