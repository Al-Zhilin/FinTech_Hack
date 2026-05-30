from pydantic import BaseModel


class CashflowCalculateRequest(BaseModel):
    user_id: str
    current_balance: float
    days_to_salary: int


class ForecastDay(BaseModel):
    day: int
    balance: float
    event: str | None = None


class CashflowResponse(BaseModel):
    projected_balance: float | None = None
    will_be_negative: bool | None = None
    shortage: float | None = None
    days_to_salary: int | None = None
    daily_avg_spend: float | None = None
    danger_day: int | None = None
    verdict: str | None = None
    daily_burn: float | None = None
    forecast: list[ForecastDay] = []
    risk_events: list[ForecastDay] = []
    critical_day: int | None = None
    error: str | None = None
