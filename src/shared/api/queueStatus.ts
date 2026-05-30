const API_BASE = '/api/v1';

export interface QueueStatus {
  queue_size: number;
  processing: boolean;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  const res = await fetch(`${API_BASE}/ai/queue/status`);
  if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
  return res.json();
}
