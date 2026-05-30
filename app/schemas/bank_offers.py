from pydantic import BaseModel


class BankOffersRequest(BaseModel):
    user_id: str
    loan_amount: float
    loan_rate: float
    loan_months: int


class BankOffer(BaseModel):
    bank_name: str
    domain: str
    rate: float
    loan_months: int
    monthly_payment: float
    score: int
    logo_url: str
    offer_url: str


class BankOffersResponse(BaseModel):
    offers: list[BankOffer]
    search_query: str
