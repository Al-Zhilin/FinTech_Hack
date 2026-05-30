from pydantic import BaseModel


class PatternsResponse(BaseModel):
    pattern_label: str | None = None
    expense_ratio: float | None = None
    debt_ratio: float | None = None
    free_ratio: float | None = None
    top_category: str | None = None
    insight: str
    breakdown: dict = {}
