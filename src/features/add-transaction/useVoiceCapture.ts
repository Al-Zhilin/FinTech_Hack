import { useEffect, useRef, useState } from 'react';

/**
 * Голосовой ввод через Web Speech API (ru-RU).
 * Используется для быстрого добавления наличных расходов голосом.
 */
export const useVoiceCapture = () => {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch { /* noop */ } };
  }, []);

  const start = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    try { recognitionRef.current.start(); setListening(true); } catch { /* already started */ }
  };
  const stop = () => { try { recognitionRef.current?.stop(); } catch { /* noop */ } setListening(false); };

  return { supported, listening, transcript, start, stop, reset: () => setTranscript('') };
};

/** Грубый парсер фразы вида «кофе 250» / «потратил 1200 на такси». */
export const parseVoiceExpense = (text: string): { amount: number; title: string } => {
  const cleaned = text.replace(/[^\d\sа-яёa-z.,]/gi, ' ');
  const numMatch = cleaned.match(/\d[\d\s.,]*/);
  const amount = numMatch ? Math.round(Number(numMatch[0].replace(/[\s,]/g, '').replace(/\.\d*$/, ''))) || 0 : 0;
  const title = cleaned
    .replace(/\d[\d\s.,]*/g, ' ')
    .replace(/\b(потратил[а]?|на|рублей|руб|за|это|купил[а]?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { amount, title: title || 'Наличные' };
};
