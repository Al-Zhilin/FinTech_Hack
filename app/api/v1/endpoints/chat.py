from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

# Контракт AI-сервиса: последние 10 сообщений (5 пар user/assistant)
_HISTORY_LIMIT = 10


@router.post("/message", response_model=ChatResponse, summary="Send message to AI")
async def send_message(request: ChatRequest) -> ChatResponse:
    db = get_db()

    # Получаем или создаём пользователя
    user = await db.users.find_one({"login": request.login})
    if user is None:
        user = {
            "login": request.login,
            "ai_user_id": str(uuid4()),
            "profile": {},
            "onboarding_complete": False,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user)

    ai_user_id: str = user["ai_user_id"]
    user_profile: dict = user.get("profile") or {}

    # Берём историю ДО текущего сообщения
    cursor = (
        db.messages.find({"login": request.login})
        .sort("created_at", -1)
        .limit(_HISTORY_LIMIT)
    )
    previous = await cursor.to_list(length=_HISTORY_LIMIT)
    previous.reverse()  # хронологический порядок для AI

    history = [{"role": msg["role"], "content": msg["content"]} for msg in previous]

    # Сохраняем сообщение пользователя
    await db.messages.insert_one(
        {
            "login": request.login,
            "role": "user",
            "content": request.message,
            "created_at": datetime.now(timezone.utc),
        }
    )

    payload = {
        "user_id": ai_user_id,
        "query": request.message,
        "context": {"user_profile": user_profile},
        "mode": "chat",
        "history": history,
    }

    # AI LLM отвечает до 60 сек — таймаут 90 с запасом
    try:
        async with httpx.AsyncClient(verify=settings.CA_CERT_PATH, timeout=90.0) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/ai/process", json=payload
            )
            response.raise_for_status()
            ai_data: dict = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {exc}")

    # Сохраняем ответ AI в историю
    await db.messages.insert_one(
        {
            "login": request.login,
            "role": "assistant",
            "content": ai_data.get("text", ""),
            "created_at": datetime.now(timezone.utc),
        }
    )

    if ai_data.get("error"):
        raise HTTPException(status_code=502, detail=f"AI error: {ai_data['error']}")

    return ChatResponse(**ai_data)
