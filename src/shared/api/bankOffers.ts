const API_BASE = '/api/v1';

export interface BankOfferItem {
  bank_name: string;
  domain: string;
  rate: number;
  loan_months: number;
  monthly_payment: number;
  score: number;
  logo_url?: string | null;
  offer_url?: string | null;
}

export interface BankOffersResult {
  offers: BankOfferItem[];
  search_query?: string;
  error?: string | null;
}

export async function getBankOffers(
  userId: string,
  loanAmount: number,
  loanRate: number,
  loanMonths: number,
): Promise<BankOffersResult | null> {
  try {
    const res = await fetch(`${API_BASE}/ai/bank-offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        loan_amount: loanAmount,
        loan_rate: loanRate,
        loan_months: loanMonths,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
