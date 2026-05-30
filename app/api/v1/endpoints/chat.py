import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

_HISTORY_LIMIT = 10
_STREAM_TIMEOUT = httpx.Timeout(connect=10.0, read=None, write=10.0, pool=10.0)
_CHAT_TIMEOUT = httpx.Timeout(connect=10.0, read=180.0, write=10.0, pool=10.0)
_NO_CONNECTION = "Нет соединения с AI-сервером"

_FLOAT_PROFILE_FIELDS = (
    "monthly_income", "monthly_expenses", "monthly_debt_payments",
    "savings", "financial_goal_amount", "current_balance",
)
_INT_PROFILE_FIELDS = ("days_to_salary",)


def _sanitize_profile(profile: dict) -> dict:
    """Привести числовые поля профиля к нужным типам перед отправкой в AI-сервер."""
    out = dict(profile)
    for field in _FLOAT_PROFILE_FIELDS:
        if field in out:
            try:
                out[field] = float(out[field]) if out[field] is not None else None
            except (TypeError, ValueError):
                out[field] = None
    for field in _INT_PROFILE_FIELDS:
        if field in out:
            try:
                out[field] = int(out[field]) if out[field] is not None else None
            except (TypeError, ValueError):
                out[field] = None
    return out


async def _get_or_create_user(db, login: str) -> dict:
    user = await db.users.find_one({"login": login})
    if user is None:
        user = {
            "login": login,
            "profile": {},
            "onboarding_complete": False,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user)
    return user


async def _get_history(db, login: str) -> list[dict]:
    cursor = (
        db.messages.find({"login": login})
        .sort("created_at", -1)
        .limit(_HISTORY_LIMIT)
    )
    previous = await cursor.to_list(length=_HISTORY_LIMIT)
    previous.reverse()
    return [{"role": msg["role"], "text": msg["content"]} for msg in previous]


@router.post("/message", response_model=ChatResponse, summary="Send message to AI")
async def send_message(request: ChatRequest) -> ChatResponse:
    db = get_db()
    user = await _get_or_create_user(db, request.login)

    user_profile: dict = _sanitize_profile(user.get("profile") or {})
    history = await _get_history(db, request.login)

    await db.messages.insert_one({
        "login": request.login,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    })

    payload = {
        "user_id": request.login,
        "query": request.message,
        "context": {"user_profile": user_profile, "history": history},
        "mode": "chat",
    }

    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_CHAT_TIMEOUT, trust_env=False) as client:
            response = await client.post(f"{settings.AI_SERVICE_URL}/ai/process", json=payload)
            response.raise_for_status()
            ai_data: dict = response.json()
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout):
        raise HTTPException(status_code=503, detail=_NO_CONNECTION)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI server returned {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {type(exc).__name__}")

    await db.messages.insert_one({
        "login": request.login,
        "role": "assistant",
        "content": ai_data.get("text", ""),
        "created_at": datetime.now(timezone.utc),
    })

    return ChatResponse(**ai_data)


@router.post("/stream", summary="Send message to AI with SSE streaming")
async def stream_message(request: ChatRequest) -> StreamingResponse:
    db = get_db()
    user = await _get_or_create_user(db, request.login)

    user_profile: dict = _sanitize_profile(user.get("profile") or {})
    history = await _get_history(db, request.login)

    await db.messages.insert_one({
        "login": request.login,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    })

    payload = {
        "user_id": request.login,
        "query": request.message,
        "context": {"user_profile": user_profile, "history": history},
        "mode": "chat",
    }

    async def generate():
        result_text = ""
        try:
            async with httpx.AsyncClient(
                verify=settings.httpx_verify,
                timeout=_STREAM_TIMEOUT,
                trust_env=False,
            ) as client:
                async with client.stream(
                    "POST",
                    f"{settings.AI_SERVICE_URL}/ai/stream",
                    json=payload,
                ) as response:
                    async for line in response.aiter_lines():
                        yield f"{line}\n"
                        if line.startswith("data:"):
                            try:
                                data = json.loads(line[5:].strip())
                                if "text" in data:
                                    result_text = data.get("text", "")
                            except json.JSONDecodeError:
                                pass
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout):
            yield f"event: error\ndata: {json.dumps({'error': _NO_CONNECTION}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'error': f'AI service error: {type(exc).__name__}'}, ensure_ascii=False)}\n\n"
        finally:
            if result_text:
                await db.messages.insert_one({
                    "login": request.login,
                    "role": "assistant",
                    "content": result_text,
                    "created_at": datetime.now(timezone.utc),
                })

    return StreamingResponse(generate(), media_type="text/event-stream")
