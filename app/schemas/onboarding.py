from pydantic import BaseModel


class OnboardingRequest(BaseModel):
    login: str
    message: str


class OnboardingResponse(BaseModel):
    question: str | None = None
    phase: int
    complete: bool
    profile_summary: str | None = None
    error: str | None = None
