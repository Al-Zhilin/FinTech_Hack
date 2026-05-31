const API_BASE = '/api/v1';

export interface ForecastDay {
  day: number;
  balance: number;
  event?: string | null;
}

export interface RiskEvent {
  day: number;
  balance: number;
  event: string;
}

export interface CashflowResult {
  projected_balance?: number | null;
  will_be_negative?: boolean;
  shortage?: number | null;
  days_to_salary?: number | null;
  daily_avg_spend?: number | null;
  danger_day?: number | null;
  verdict?: string;
  daily_burn?: number | null;
  forecast?: ForecastDay[];
  risk_events?: RiskEvent[];
  critical_day?: number | null;
  error?: string | null;
}

export async function getCashflow(userId: string): Promise<CashflowResult | null> {
  try {
    const res = await fetch(`${API_BASE}/ai/cashflow/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function calculateCashflow(
  userId: string,
  currentBalance: number,
  daysToSalary: number,
): Promise<CashflowResult | null> {
  try {
    const res = await fetch(`${API_BASE}/ai/cashflow/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, current_balance: currentBalance, days_to_salary: daysToSalary }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
