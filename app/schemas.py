from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


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
