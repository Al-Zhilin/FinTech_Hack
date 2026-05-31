const API_BASE = '/api/v1';

export interface PatternsResult {
  pattern_label?: string | null;
  insight: string;
  breakdown?: Record<string, number>;
  expense_ratio?: number | null;
  debt_ratio?: number | null;
  free_ratio?: number | null;
  error?: string;
}

export async function getPatterns(
  userId: string,
  income?: number,
  expenses?: number,
): Promise<PatternsResult | null> {
  try {
    const params = new URLSearchParams();
    if (income && income > 0)   params.set('income', String(income));
    if (expenses && expenses > 0) params.set('monthly_expenses', String(expenses));
    const query = params.toString();
    const url = `${API_BASE}/ai/patterns/${encodeURIComponent(userId)}${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
