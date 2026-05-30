from pydantic import BaseModel


class ChatRequest(BaseModel):
    login: str
    message: str


class AIStructured(BaseModel):
    summary: str | None = None
    recommendations: list[str] = []
    risks: list[str] = []
    calculator_result: dict = {}


class TableData(BaseModel):
    headers: list[str]
    rows: list[list[str]]


class ChatResponse(BaseModel):
    text: str
    table: TableData | None = None
    structured: AIStructured | dict = {}
    sources: list[str] = []
    intent: str = "question"
    error: str | None = None
