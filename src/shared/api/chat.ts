import { streamSse } from './sse';
import type { CalculatorResult } from '@/shared/types';

const API_BASE = '/api/v1';

export interface JsonTable {
  headers: string[];
  rows: string[][];
}

export interface ChatResult {
  text: string;
  table?: string;           // HTML-строка таблицы (опционально, на верхнем уровне)
  _tableJson?: JsonTable;   // JSON-таблица, извлечённая из смешанного формата в sse.ts
  structured?: {
    calculator_result?: CalculatorResult;
    table?: string;
    summary?: string | null;
    recommendations?: string[];
    risks?: string[];
    [key: string]: unknown;
  };
  sources?: string[];
  intent?: string;
  error?: string | null;
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
