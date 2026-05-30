import asyncio
import json
import logging
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .calculators import cashflow_forecast_detailed
from .daily_action import get_daily_action
from .database import _get_db, get_onboarding_history, get_user_profile
from .graph import AgentState, node_analyst, node_planner, node_search, run_graph
from .llm import OllamaClient
from .onboarding import process_onboarding
from .patterns import analyze_patterns
from .queue import acquire, get_status, release
from .schemas import AIRequest, AIResponse, CashflowRequest

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

def _cashflow_for_user(user_id: str) -> dict:
    profile = get_user_profile(user_id)
    if not profile:
        return {"error": "Профиль не найден"}
    f = profile.get("finances", {})
    current_balance = f.get("current_balance")
    if current_balance is None:
        return {"error": "Нет данных о текущем балансе"}
    return cashflow_forecast_detailed(
        current_balance=float(current_balance),
        monthly_expenses=float(f.get("monthly_expenses_estimate") or 0.0),
        monthly_debt_payments=float(f.get("monthly_debt_payments") or 0.0),
        days_to_salary=int(f.get("days_to_salary") or 15),
        fixed_payments=f.get("fixed_payments") or [],
    )


@app.post("/ai/cashflow/calculate")
async def cashflow_calculate(request: CashflowRequest):
    logger.info(f"[/ai/cashflow/calculate] user_id={request.user_id}")
    profile = get_user_profile(request.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль не найден")
    f = profile.get("finances", {})
    monthly_expenses = f.get("monthly_expenses_estimate")
    if not monthly_expenses:
        raise HTTPException(status_code=422, detail="Сначала пройдите онбординг")
    result = await asyncio.to_thread(
        cashflow_forecast_detailed,
        current_balance=float(request.current_balance),
        monthly_expenses=float(monthly_expenses),
        monthly_debt_payments=float(f.get("monthly_debt_payments") or 0.0),
        days_to_salary=int(request.days_to_salary),
        fixed_payments=f.get("fixed_payments") or [],
    )
    return result


@app.get("/ai/cashflow/{user_id}")
async def cashflow(user_id: str):
    logger.info(f"[/ai/cashflow] user_id={user_id}")
    await acquire(f"cashflow user={user_id}")
    try:
        return await asyncio.to_thread(_cashflow_for_user, user_id)
    except Exception as e:
        logger.error(f"[/ai/cashflow] error: {e}", exc_info=True)
        return {"error": str(e)}
    finally:
        release(f"cashflow user={user_id}")


@app.get("/ai/patterns/{user_id}")
async def patterns(user_id: str):
    logger.info(f"[/ai/patterns] user_id={user_id}")
    await acquire(f"patterns user={user_id}")
    try:
        return await asyncio.to_thread(analyze_patterns, user_id)
    except Exception as e:
        logger.error(f"[/ai/patterns] error: {e}", exc_info=True)
        return {
            "pattern_label": None, "expense_ratio": None, "debt_ratio": None,
            "free_ratio": None, "top_category": None,
            "insight": "Произошла ошибка при анализе.", "breakdown": {},
            "error": str(e),
        }
    finally:
        release(f"patterns user={user_id}")


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
            table=result.get("table"),
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
                "table": state.get("table"),
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
            "suggested_answers": result.get("suggested_answers", []),
            "phase": result["phase"],
            "complete": result["onboarding_complete"],
            "profile_summary": result.get("profile_summary"),
        }
    except Exception as e:
        logger.error(f"[/ai/onboarding] error: {e}", exc_info=True)
        return {
            "question": "Расскажите немного о себе — чем занимаетесь?",
            "suggested_answers": ["Работаю в офисе", "Фриланс или своё дело", "Учусь"],
            "phase": 1,
            "complete": False,
            "profile_summary": None,
            "error": str(e),
        }
    finally:
        release(f"onboarding user={request.user_id}")


@app.get("/ai/daily-action/{user_id}")
async def daily_action(user_id: str):
    logger.info(f"[/ai/daily-action] user_id={user_id}")
    await acquire(f"daily_action user={user_id}")
    try:
        result = await asyncio.to_thread(get_daily_action, user_id)
        return result
    except Exception as e:
        logger.error(f"[/ai/daily-action] error: {e}", exc_info=True)
        return {
            "action": "Пройдите онбординг",
            "category": "",
            "impact": "Получите персональный анализ финансов",
            "error": str(e),
        }
    finally:
        release(f"daily_action user={user_id}")


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
