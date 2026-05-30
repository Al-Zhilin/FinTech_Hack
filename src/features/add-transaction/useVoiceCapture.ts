import { useEffect, useRef, useState } from 'react';

const SR_ERROR_LABELS: Record<string, string> = {
  'not-allowed':       'Нет доступа к микрофону. Разрешите его в настройках браузера.',
  'no-speech':         'Речь не обнаружена. Попробуйте ещё раз.',
  'network':           'Ошибка сети. Проверьте подключение.',
  'audio-capture':     'Микрофон не найден или занят.',
  'service-not-allowed': 'Голосовой ввод отключён в браузере.',
};

export const useVoiceCapture = () => {
  const srClassRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [notSecure, setNotSecure] = useState(false);

  useEffect(() => {
    // Microphone API requires a secure context (HTTPS / localhost)
    if (!window.isSecureContext) { setSupported(false); setNotSecure(true); return; }
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRClass) { setSupported(false); return; }
    srClassRef.current = SRClass;
  }, []);

  const start = () => {
    if (!srClassRef.current) return;

    // Уничтожаем предыдущий экземпляр — после onend он уже нельзя переиспользовать
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }

    const rec = new srClassRef.current();
    rec.lang = 'ru-RU';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };

    rec.onend = () => setListening(false);

    rec.onerror = (e: any) => {
      setListening(false);
      const label = SR_ERROR_LABELS[e.error] ?? `Ошибка: ${e.error}`;
      if (e.error !== 'no-speech') setError(label);
    };

    recognitionRef.current = rec;
    setTranscript('');
    setError(null);

    try {
      rec.start();
      setListening(true);
    } catch (e: any) {
      setError('Не удалось запустить распознавание. Попробуйте ещё раз.');
    }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  return {
    supported,
    notSecure,
    listening,
    transcript,
    error,
    start,
    stop,
    reset: () => { setTranscript(''); setError(null); },
  };
};

/** Грубый парсер фразы вида «кофе 250» / «потратил 1200 на такси». */
export const parseVoiceExpense = (text: string): { amount: number; title: string } => {
  const cleaned = text.replace(/[^\d\sа-яёa-z.,]/gi, ' ');
  const numMatch = cleaned.match(/\d[\d\s.,]*/);
  const amount = numMatch
    ? Math.round(Number(numMatch[0].replace(/[\s,]/g, '').replace(/\.\d*$/, ''))) || 0
    : 0;
  const title = cleaned
    .replace(/\d[\d\s.,]*/g, ' ')
    .replace(/\b(потратил[а]?|на|рублей|руб|за|это|купил[а]?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { amount, title: title || 'Наличные' };
};
