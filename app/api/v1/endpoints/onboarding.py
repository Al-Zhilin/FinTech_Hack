import asyncio
import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.scheduler import refresh_user_cache
from app.schemas.onboarding import OnboardingRequest, OnboardingResponse

router = APIRouter()

_NO_CONNECTION = "Нет соединения с AI-сервером"


def _to_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _map_ai_profile_to_user_profile(ai_profile: dict) -> dict:
    finances: dict = ai_profile.get("finances") or {}
    meta: dict = ai_profile.get("meta") or {}

    goals: list[str] = []
    if finances.get("financial_goal"):
        goals.append(finances["financial_goal"])

    return {
        "monthly_income": _to_float(finances.get("monthly_income")),
        "monthly_expenses": _to_float(finances.get("monthly_expenses_estimate")),
        "monthly_debt_payments": _to_float(finances.get("monthly_debt_payments")),
        "savings": _to_float(finances.get("savings")),
        "financial_goal_amount": _to_float(finances.get("financial_goal_amount")),
        "goals": goals,
        "financial_literacy": meta.get("financial_literacy"),
    }


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


async def _call_ai_onboarding(login: str, message: str) -> dict:
    payload = {"user_id": login, "message": message}
    async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=60.0, trust_env=False) as client:
        response = await client.post(f"{settings.AI_SERVICE_URL}/ai/onboarding", json=payload)
        response.raise_for_status()
        return response.json()


async def _persist_ai_response(db, login: str, ai_data: dict) -> None:
    if ai_data.get("question"):
        await db.messages.insert_one({
            "login": login,
            "role": "assistant",
            "content": ai_data["question"],
            "created_at": datetime.now(timezone.utc),
        })
    if ai_data.get("complete"):
        await _save_profile(db, login)
        # Обновляем кеш AI-данных сразу после завершения онбординга
        asyncio.create_task(refresh_user_cache(login))


async def _save_profile(db, login: str) -> None:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=5.0, trust_env=False) as client:
            response = await client.get(
                f"{settings.AI_SERVICE_URL}/ai/onboarding/{login}/status"
            )
            response.raise_for_status()
            status_data: dict = response.json()
    except Exception:
        return

    ai_profile = status_data.get("profile")
    if not ai_profile:
        return

    user_profile = _map_ai_profile_to_user_profile(ai_profile)
    await db.users.update_one(
        {"login": login},
        {"$set": {"profile": user_profile, "onboarding_complete": True}},
    )


@router.post("/step", response_model=OnboardingResponse, summary="Onboarding step")
async def onboarding_step(request: OnboardingRequest) -> OnboardingResponse:
    db = get_db()
    await _get_or_create_user(db, request.login)

    await db.messages.insert_one({
        "login": request.login,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    })

    try:
        ai_data = await _call_ai_onboarding(request.login, request.message)
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout):
        raise HTTPException(status_code=503, detail=_NO_CONNECTION)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI server returned {exc.response.status_code}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {type(exc).__name__}")

    await _persist_ai_response(db, request.login, ai_data)
    return OnboardingResponse(**ai_data)


@router.post("/stream", summary="Onboarding step with SSE streaming")
async def stream_onboarding_step(request: OnboardingRequest) -> StreamingResponse:
    db = get_db()
    await _get_or_create_user(db, request.login)

    await db.messages.insert_one({
        "login": request.login,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    })

    async def generate():
        yield f"event: status\ndata: {json.dumps({'status': 'processing', 'message': 'Обрабатываем ответ...'}, ensure_ascii=False)}\n\n"

        try:
            ai_data = await _call_ai_onboarding(request.login, request.message)
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout):
            yield f"event: error\ndata: {json.dumps({'error': _NO_CONNECTION}, ensure_ascii=False)}\n\n"
            return
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'error': f'AI service error: {type(exc).__name__}'}, ensure_ascii=False)}\n\n"
            return

        await _persist_ai_response(db, request.login, ai_data)
        yield f"event: result\ndata: {json.dumps(ai_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
