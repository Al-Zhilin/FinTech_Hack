import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="AI service availability check")
async def ai_health():
    try:
        async with httpx.AsyncClient(verify=settings.CA_CERT_PATH, timeout=10.0) as client:
            response = await client.get(f"{settings.AI_SERVICE_URL}/health")
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected error: {exc}")

    if data.get("status") != "ok":
        raise HTTPException(status_code=502, detail=f"AI service returned unexpected status: {data}")

    if data.get("ollama") != "up":
        raise HTTPException(status_code=502, detail=f"Ollama is down: {data}")

    return {"message": "ok, ai is available"}
