// Общий клиент для SSE-over-POST (см. гайд бэкенда).
// Надёжно: проверяет HTTP-статус, наличие тела, защищает JSON.parse,
// поддерживает \n и \r\n. Не ставит таймаут — стрим живёт до event: result.

export interface SseHandlers {
  onStatus?: (message: string) => void;
  onResult: (data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
}

export async function streamSse(
  url: string,
  body: unknown,
  handlers: SseHandlers,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Не удалось подключиться к серверу');
  }

  // По гайду статус всегда 200; всё иное (502/504/...) — ошибка шлюза/сервера.
  if (!response.ok) {
    throw new Error(`Сервер недоступен (${response.status}). Попробуйте ещё раз.`);
  }
  if (!response.body) {
    throw new Error('Пустой ответ сервера');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType = '';
  let resolved = false;

  const handleData = (raw: string) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      return; // частичный/невалидный кусок — пропускаем, не роняя поток
    }
    if (eventType === 'status') {
      handlers.onStatus?.(String(data.message ?? ''));
    } else if (eventType === 'result') {
      resolved = true;
      handlers.onResult(data);
    } else if (eventType === 'error') {
      throw new Error(String(data.error ?? 'Неизвестная ошибка'));
    }
  };

  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch {
      throw new Error('Соединение прервалось. Попробуйте ещё раз.');
    }
    const { done, value } = chunk;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const l = line.trimEnd();
      if (l.startsWith('event:')) {
        eventType = l.slice(6).trim();
      } else if (l.startsWith('data:')) {
        handleData(l.slice(5).trim());
        if (resolved) return;
      }
      // пустая строка — конец SSE-кадра, ничего не делаем
    }
  }

  if (!resolved) throw new Error('Соединение закрыто без ответа');
}
