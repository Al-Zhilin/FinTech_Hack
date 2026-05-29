import json
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

_HISTORY_LIMIT = 10
# Таймаут для стриминга: connect ограничен, read — открыт до конца потока
_STREAM_TIMEOUT = httpx.Timeout(connect=10.0, read=None, write=10.0, pool=10.0)


async def _get_or_create_user(db, login: str) -> dict:
    user = await db.users.find_one({"login": login})
    if user is None:
        user = {
            "login": login,
            "ai_user_id": str(uuid4()),
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
    return [{"role": msg["role"], "content": msg["content"]} for msg in previous]


@router.post("/message", response_model=ChatResponse, summary="Send message to AI")
async def send_message(request: ChatRequest) -> ChatResponse:
    db = get_db()
    user = await _get_or_create_user(db, request.login)

    ai_user_id: str = user["ai_user_id"]
    user_profile: dict = user.get("profile") or {}
    history = await _get_history(db, request.login)

    await db.messages.insert_one({
        "login": request.login,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    })

    payload = {
        "user_id": ai_user_id,
        "query": request.message,
        "context": {"user_profile": user_profile},
        "mode": "chat",
        "history": history,
    }

    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=120.0, trust_env=False) as client:
            response = await client.post(f"{settings.AI_SERVICE_URL}/ai/process", json=payload)
            response.raise_for_status()
            ai_data: dict = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")

    await db.messages.insert_one({
        "login": request.login,
        "role": "assistant",
        "content": ai_data.get("text", ""),
        "created_at": datetime.now(timezone.utc),
    })

    if ai_data.get("error"):
        raise HTTPException(status_code=502, detail=f"AI error: {ai_data['error']}")

    return ChatResponse(**ai_data)


@router.post("/stream", summary="Send message to AI with SSE streaming")
async def stream_message(request: ChatRequest) -> StreamingResponse:
    db = get_db()
    user = await _get_or_create_user(db, request.login)

    ai_user_id: str = user["ai_user_id"]
    user_profile: dict = user.get("profile") or {}
    history = await _get_history(db, request.login)

    await db.messages.insert_one({
        "login": request.login,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    })

    payload = {
        "user_id": ai_user_id,
        "query": request.message,
        "context": {"user_profile": user_profile},
        "mode": "chat",
        "history": history,
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
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            if result_text:
                await db.messages.insert_one({
                    "login": request.login,
                    "role": "assistant",
                    "content": result_text,
                    "created_at": datetime.now(timezone.utc),
                })

    return StreamingResponse(generate(), media_type="text/event-stream")
