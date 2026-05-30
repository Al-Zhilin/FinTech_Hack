import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.daily_action import DailyActionResponse

router = APIRouter()


_DAILY_ACTION_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


@router.get("/daily-action/{user_id}", response_model=DailyActionResponse, summary="Get daily action for user")
async def get_daily_action(user_id: str) -> DailyActionResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_DAILY_ACTION_TIMEOUT, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/ai/daily-action/{user_id}")
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")

    return DailyActionResponse(
        action=data["action"],  
        category=data["category"],
        impact=data["impact"],
    )


@router.get("/health", summary="AI service availability check")
async def ai_health():
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=10.0, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/health")
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")

    if data.get("status") != "ok":
        raise HTTPException(status_code=502, detail=f"AI service returned unexpected status: {data}")

    if data.get("ollama") != "up":
        raise HTTPException(status_code=502, detail=f"Ollama is down: {data}")

    return {"message": "ok, ai is available"}
