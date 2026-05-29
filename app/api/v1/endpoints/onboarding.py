from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.database import get_db
from app.schemas.onboarding import OnboardingRequest, OnboardingResponse

router = APIRouter()

_HISTORY_LIMIT = 10


def _map_ai_profile_to_user_profile(ai_profile: dict) -> dict:
    finances: dict = ai_profile.get("finances") or {}
    meta: dict = ai_profile.get("meta") or {}

    goals: list[str] = []
    if finances.get("financial_goal"):
        goals.append(finances["financial_goal"])

    return {
        "monthly_income": finances.get("monthly_income"),
        "monthly_expenses": finances.get("monthly_expenses_estimate"),
        "monthly_debt_payments": finances.get("monthly_debt_payments"),
        "savings": finances.get("savings"),
        "financial_goal_amount": finances.get("financial_goal_amount"),
        "goals": goals,
        "financial_literacy": meta.get("financial_literacy"),
    }


@router.post("/step", response_model=OnboardingResponse, summary="Onboarding step")
async def onboarding_step(request: OnboardingRequest) -> OnboardingResponse:
    db = get_db()

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

    # Берём историю ДО текущего сообщения
    cursor = (
        db.messages.find({"login": request.login})
        .sort("created_at", -1)
        .limit(_HISTORY_LIMIT)
    )
    previous = await cursor.to_list(length=_HISTORY_LIMIT)
    previous.reverse()

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

    try:
        async with httpx.AsyncClient(verify=settings.CA_CERT_PATH, timeout=60.0) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/ai/onboarding",
                json={
                    "user_id": ai_user_id,
                    "message": request.message,
                    "history": history,
                },
            )
            response.raise_for_status()
            ai_data: dict = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {exc}")

    # Сохраняем ответ AI (вопрос онбординга) в историю
    if ai_data.get("question"):
        await db.messages.insert_one(
            {
                "login": request.login,
                "role": "assistant",
                "content": ai_data["question"],
                "created_at": datetime.now(timezone.utc),
            }
        )

    if ai_data.get("complete"):
        await _save_profile(db, request.login, ai_user_id)

    return OnboardingResponse(**ai_data)


async def _save_profile(db, login: str, ai_user_id: str) -> None:
    try:
        async with httpx.AsyncClient(verify=settings.CA_CERT_PATH, timeout=5.0) as client:
            response = await client.get(
                f"{settings.AI_SERVICE_URL}/ai/onboarding/{ai_user_id}/status"
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
