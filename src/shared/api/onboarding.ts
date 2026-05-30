import { streamSse } from './sse';

const API_BASE = '/api/v1';

export interface OnboardingResult {
  complete: boolean;
  question?: string;
  options?: string[];        // варианты ответа от AI (если бэкенд их прислал)
  profile_summary?: string;
  error?: string;
}

export async function onboardingStep(
  login: string,
  message: string,
  onStatus: (msg: string) => void,
): Promise<OnboardingResult> {
  let result: OnboardingResult | null = null;
  await streamSse(
    `${API_BASE}/onboarding/stream`,
    { login, message },
    {
      onStatus,
      onResult: (data) => { result = data as unknown as OnboardingResult; },
    },
  );
  if (!result) throw new Error('Сервер не вернул ответ');
  return result;
}

/**
 * Достаёт варианты ответа из результата: сначала из поля options,
 * иначе пытается распарсить из текста вопроса (строки-списки).
 */
export function extractOptions(result: OnboardingResult): string[] {
  if (Array.isArray(result.options) && result.options.length) {
    return result.options.map(String).filter(Boolean).slice(0, 6);
  }
  const q = result.question ?? '';
  const lines = q.split('\n').map(l => l.trim());
  const opts: string[] = [];
  for (const line of lines) {
    // «1) …», «1. …», «- …», «• …», «a) …»
    const m = line.match(/^(?:[-•*]|\d+[).]|[a-zа-я][).])\s+(.+)$/i);
    if (m && m[1].length <= 60) opts.push(m[1].trim());
  }
  return opts.slice(0, 6);
}

/** Убирает из текста вопроса перечисление вариантов (оставляет сам вопрос). */
export function stripOptions(question: string): string {
  return question
    .split('\n')
    .filter(l => !/^(?:[-•*]|\d+[).]|[a-zа-я][).])\s+/i.test(l.trim()))
    .join('\n')
    .trim();
}
