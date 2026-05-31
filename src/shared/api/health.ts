const API_BASE = '/api/v1';

export interface HealthResult {
  status: string;
  version?: string;
  timestamp?: string;
}

export async function getHealth(): Promise<HealthResult | null> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getAiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/ai/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.message?.includes('ok') ?? false;
  } catch {
    return false;
  }
}
