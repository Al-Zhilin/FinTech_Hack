import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.bank_offers import BankOffersRequest, BankOffersResponse
from app.schemas.cashflow import CashflowCalculateRequest, CashflowResponse
from app.schemas.daily_action import DailyActionResponse
from app.schemas.patterns import PatternsResponse

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
            return CashflowResponse(**response.json())
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")


@router.post("/cashflow/calculate", response_model=CashflowResponse, summary="Calculate cashflow by current balance")
async def calculate_cashflow(request: CashflowCalculateRequest) -> CashflowResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=10.0, trust_env=False) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/ai/cashflow/calculate",
                json=request.model_dump(),
            )
            response.raise_for_status()
            return CashflowResponse(**response.json())
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")


_PATTERNS_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


@router.get("/patterns/{user_id}", response_model=PatternsResponse, summary="Spending patterns analysis for user")
async def get_patterns(user_id: str) -> PatternsResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_PATTERNS_TIMEOUT, trust_env=False) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/ai/patterns/{user_id}")
            response.raise_for_status()
            return PatternsResponse(**response.json())
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")


_BANK_OFFERS_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


@router.post("/bank-offers", response_model=BankOffersResponse, summary="Get bank loan offers for user")
async def get_bank_offers(request: BankOffersRequest) -> BankOffersResponse:
    try:
        async with httpx.AsyncClient(verify=settings.httpx_verify, timeout=_BANK_OFFERS_TIMEOUT, trust_env=False) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/ai/bank-offers",
                json=request.model_dump(),
            )
            response.raise_for_status()
            return BankOffersResponse(**response.json())
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {type(exc).__name__}: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {type(exc).__name__}: {exc}")


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
