import httpx
from fastapi import APIRouter, HTTPException

from app.core.cache import get_cached, set_cached
from app.core.config import settings
from app.core.fallbacks import cashflow_calculate_fallback
from app.schemas.bank_offers import BankOffersRequest, BankOffersResponse
from app.schemas.cashflow import CashflowCalculateRequest, CashflowResponse
from app.schemas.daily_action import DailyActionResponse
from app.schemas.patterns import PatternsResponse

router = APIRouter()

_NO_CONNECTION = "Нет соединения с AI-сервером"

_DAILY_ACTION_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
_PATTERNS_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
_BANK_OFFERS_TIMEOUT = httpx.Timeout(connect=10.0, read=90.0, write=10.0, pool=10.0)


@router.get("/daily-action/{user_id}", response_model=DailyActionResponse, summary="Get daily action for user")
async def get_daily_action(user_id: str) -> DailyActionResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_DAILY_ACTION_TIMEOUT, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/ai/daily-action/{user_id}")
            response.raise_for_status()
            data = response.json()
        await set_cached(user_id, "daily_action", data)
        return DailyActionResponse(**data)
    except Exception:
        cached = await get_cached(user_id, "daily_action")
        if cached:
            return DailyActionResponse(**cached)
        raise HTTPException(status_code=503, detail=_NO_CONNECTION)


@router.get("/queue/status", summary="AI queue status")
async def get_queue_status() -> dict:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=2.0, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/ai/queue/status")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")


@router.get("/cashflow/{user_id}", response_model=CashflowResponse, summary="Cashflow forecast for user")
async def get_cashflow(user_id: str) -> CashflowResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=10.0, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/ai/cashflow/{user_id}")
            response.raise_for_status()
            data = response.json()
        await set_cached(user_id, "cashflow", data)
        return CashflowResponse(**data)
    except Exception:
        cached = await get_cached(user_id, "cashflow")
        if cached:
            return CashflowResponse(**cached)
        raise HTTPException(status_code=503, detail=_NO_CONNECTION)


@router.post("/cashflow/calculate", response_model=CashflowResponse, summary="Calculate cashflow by current balance")
async def calculate_cashflow(request: CashflowCalculateRequest) -> CashflowResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=10.0, trust_env=False) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/ai/cashflow/calculate",
                json=request.model_dump(),
            )
            if 400 <= response.status_code < 500:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json().get("detail", response.text),
                )
            response.raise_for_status()
            return CashflowResponse(**response.json())
    except HTTPException:
        raise
    except Exception:
        return CashflowResponse(**cashflow_calculate_fallback(request.current_balance, request.days_to_salary))


@router.get("/patterns/{user_id}", response_model=PatternsResponse, summary="Spending patterns analysis for user")
async def get_patterns(user_id: str) -> PatternsResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_PATTERNS_TIMEOUT, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/ai/patterns/{user_id}")
            response.raise_for_status()
            data = response.json()
        await set_cached(user_id, "patterns", data)
        return PatternsResponse(**data)
    except Exception:
        cached = await get_cached(user_id, "patterns")
        if cached:
            return PatternsResponse(**cached)
        raise HTTPException(status_code=503, detail=_NO_CONNECTION)


@router.post("/bank-offers", response_model=BankOffersResponse, summary="Get bank loan offers for user")
async def get_bank_offers(request: BankOffersRequest) -> BankOffersResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_BANK_OFFERS_TIMEOUT, trust_env=False) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/ai/bank-offers",
                json=request.model_dump(),
            )
            response.raise_for_status()
            data = response.json()
        await set_cached(request.user_id, "bank_offers", data)
        return BankOffersResponse(**data)
    except Exception:
        cached = await get_cached(request.user_id, "bank_offers")
        if cached:
            return BankOffersResponse(**cached)
        raise HTTPException(status_code=503, detail=_NO_CONNECTION)


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
