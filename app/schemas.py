from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator


def _to_float(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace(",", ".").strip())
        except (ValueError, TypeError):
            return None
    return None


class UserProfile(BaseModel):
    age: int | None = None
    occupation: str | None = None
    financial_literacy: Literal["beginner", "medium", "advanced"] | None = None
    monthly_income: float | None = None
    monthly_expenses: float | None = None
    savings: float | None = None
    monthly_debt_payments: float | None = None
    financial_goal_amount: float | None = None
    current_balance: float | None = None
    days_to_salary: int | None = None
    fixed_payments: list[Any] | None = None
    goals: list[str] = []
    portfolio: dict[str, Any] = {}
    risk_tolerance: Literal["low", "medium", "high"] | None = None

    @field_validator(
        "monthly_income", "monthly_expenses", "savings",
        "monthly_debt_payments", "financial_goal_amount", "current_balance",
        mode="before",
    )
    @classmethod
    def coerce_float(cls, v: Any) -> float | None:
        return _to_float(v)


class ContextModel(BaseModel):
    user_profile: UserProfile = UserProfile()
    history: list[dict[str, Any]] = Field(default_factory=list)


class AIRequest(BaseModel):
    user_id: str
    query: str
    context: ContextModel = ContextModel()
    mode: str = "chat"


class TableData(BaseModel):
    headers: list[str]
    rows: list[list[str]]


class AIResponse(BaseModel):
    text: str
    table: Optional[TableData] = None
    structured: dict[str, Any] = {}
    sources: list[str] = []
    intent: str = "question"
    error: str | None = None


class CashflowRequest(BaseModel):
    user_id: str
    current_balance: float
    days_to_salary: int


class BankOffersRequest(BaseModel):
    user_id: str
    loan_amount: float
    loan_rate: float
    loan_months: int
