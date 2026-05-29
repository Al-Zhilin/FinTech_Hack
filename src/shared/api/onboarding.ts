const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export interface OnboardingResult {
  complete: boolean;
  question?: string;
  profile_summary?: string;
  error?: string;
}

export async function onboardingStep(
  login: string,
  message: string,
  onStatus: (msg: string) => void,
): Promise<OnboardingResult> {
  const response = await fetch(`${API_BASE}/onboarding/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, message }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    let eventType = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const data = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;

        if (eventType === 'status') {
          onStatus(String(data.message ?? ''));
        } else if (eventType === 'result') {
          return data as unknown as OnboardingResult;
        } else if (eventType === 'error') {
          throw new Error(String(data.error ?? 'Неизвестная ошибка'));
        }
      }
    }
  }

  throw new Error('Соединение закрыто без ответа');
}
