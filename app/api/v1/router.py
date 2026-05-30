from fastapi import APIRouter

from app.api.v1.endpoints import ai, chat, health, onboarding

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
 