from pydantic import BaseModel


class DailyActionResponse(BaseModel):
    action: str
    category: str
    impact: str
