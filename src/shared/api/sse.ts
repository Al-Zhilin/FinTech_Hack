// SSE-over-POST клиент.
// Поддерживает: event+data фреймы, data без event (трактует как result),
// сброс eventType по пустой строке (SSE-spec), \n и \r\n.

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
  let dataLines: string[] = [];
  let resolved = false;

  const dispatch = () => {
    if (dataLines.length === 0) return;
    const raw = dataLines.join('\n');
    dataLines = [];

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      // не JSON — пропускаем, не роняя поток
      eventType = '';
      return;
    }

    if (eventType === 'status') {
      handlers.onStatus?.(String(data.message ?? ''));
    } else if (eventType === 'result') {
      resolved = true;
      handlers.onResult(data);
    } else if (eventType === 'error') {
      throw new Error(String(data.error ?? 'Неизвестная ошибка'));
    } else {
      // data: без event: — если выглядит как финальный ответ (есть поле text), берём как result
      if ('text' in data || 'structured' in data) {
        resolved = true;
        handlers.onResult(data);
      }
      // иначе просто игнорируем (промежуточный фрагмент)
    }

    eventType = ''; // SSE-spec: сбрасываем тип после диспатча
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

      if (l === '') {
        // Пустая строка = конец SSE-фрейма → диспатчим
        dispatch();
        if (resolved) return;
      } else if (l.startsWith('event:')) {
        eventType = l.slice(6).trim();
      } else if (l.startsWith('data:')) {
        dataLines.push(l.slice(5).trimStart());
      }
      // id: и retry: игнорируем
    }
  }

  // Диспатчим остаток буфера (если сервер не прислал завершающую пустую строку)
  if (buffer.trim()) {
    dataLines.push(buffer.trim());
  }
  dispatch();
  if (resolved) return;

  // Последний шанс: весь ответ мог прийти как plain JSON (не SSE)
  throw new Error('Соединение закрыто без ответа');
}
