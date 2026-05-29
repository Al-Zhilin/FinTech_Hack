from pydantic import BaseModel


class ChatRequest(BaseModel):
    login: str
    message: str


class AIStructured(BaseModel):
    summary: str | None = None
    recommendations: list[str] = []
    risks: list[str] = []


class ChatResponse(BaseModel):
    text: str
    structured: AIStructured | dict = {}
    sources: list[str] = []
    intent: str = "question"
    error: str | None = None
