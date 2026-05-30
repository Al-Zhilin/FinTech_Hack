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

export async function getPatterns(userId: string): Promise<PatternsResult | null> {
  try {
    const res = await fetch(`${API_BASE}/ai/patterns/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
