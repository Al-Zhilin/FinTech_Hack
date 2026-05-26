from typing import Any, Literal
from pydantic import BaseModel


class UserProfile(BaseModel):
    age: int | None = None
    occupation: str | None = None
    financial_literacy: Literal["beginner", "medium", "advanced"] | None = None
    monthly_income: float | None = None
    monthly_expenses: float | None = None
    savings: float | None = None
    goals: list[str] = []
    portfolio: dict[str, Any] = {}
    risk_tolerance: Literal["low", "medium", "high"] | None = None


class ContextModel(BaseModel):
    user_profile: UserProfile = UserProfile()


class AIRequest(BaseModel):
    user_id: str
    query: str
    context: ContextModel = ContextModel()
    mode: str = "chat"


class AIResponse(BaseModel):
    text: str
    structured: dict[str, Any] = {}
    sources: list[str] = []
    intent: str = "question"
    error: str | None = None
