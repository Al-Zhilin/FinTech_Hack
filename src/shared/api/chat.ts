import { streamSse } from './sse';
import type { CalculatorResult } from '@/shared/types';

const API_BASE = '/api/v1';

export interface ChatResult {
  text: string;
  table?: string;           // HTML-строка таблицы (опционально, на верхнем уровне)
  structured?: {
    calculator_result?: CalculatorResult;
    table?: string;         // HTML-строка таблицы (опционально, внутри structured)
    [key: string]: unknown;
  };
  error?: string;
}

/**
 * Отправляет сообщение в чат через SSE-over-POST (см. гайд бэкенда).
 * До прихода финального result вызывает onStatus с человекочитаемым статусом.
 */
export async function sendChatMessage(
  login: string,
  message: string,
  onStatus: (msg: string) => void,
): Promise<ChatResult> {
  let result: ChatResult | null = null;
  await streamSse(
    `${API_BASE}/chat/stream`,
    { login, message },
    {
      onStatus,
      onResult: (data) => { result = data as unknown as ChatResult; },
    },
  );
  if (!result) throw new Error('Сервер не вернул ответ');
  return result;
}
