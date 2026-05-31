const API_BASE = '/api/v1';

export interface DailyActionResult {
  action: string;
  category: string;
  impact: string;
  error?: string | null;
}

export async function getDailyAction(userId: string): Promise<DailyActionResult | null> {
  try {
    const res = await fetch(`${API_BASE}/ai/daily-action/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data: DailyActionResult = await res.json();
    if (data.error || !data.action) return null;
    return data;
  } catch {
    return null;
  }
}
