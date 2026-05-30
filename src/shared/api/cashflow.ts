const API_BASE = '/api/v1';

export interface ForecastDay {
  day: number;
  balance: number;
  event?: string;
}

export interface CashflowResult {
  will_be_negative?: boolean;
  danger_day?: number;
  verdict?: string;
  forecast?: ForecastDay[];
  risk_events?: number[];
  error?: string;
}

export async function getCashflow(userId: string): Promise<CashflowResult> {
  const res = await fetch(`${API_BASE}/ai/cashflow/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
  return res.json();
}

export async function calculateCashflow(
  userId: string,
  currentBalance: number,
  daysToSalary: number,
): Promise<CashflowResult> {
  const res = await fetch(`${API_BASE}/ai/cashflow/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, current_balance: currentBalance, days_to_salary: daysToSalary }),
  });
  if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
  return res.json();
}
