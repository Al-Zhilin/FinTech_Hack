import { useEffect, useRef, useState } from 'react';
import type { TxType } from '@/shared/types';

const SR_ERROR_LABELS: Record<string, string> = {
  'not-allowed':         'Нет доступа к микрофону. Разрешите его в настройках браузера.',
  'no-speech':           'Речь не обнаружена. Попробуйте ещё раз.',
  'network':             'Ошибка сети. Проверьте подключение.',
  'audio-capture':       'Микрофон не найден или занят.',
  'service-not-allowed': 'Голосовой ввод отключён в браузере.',
};

export const useVoiceCapture = () => {
  const srClassRef      = useRef<any>(null);
  const recognitionRef  = useRef<any>(null);
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [supported, setSupported]   = useState(true);
  const [notSecure, setNotSecure]   = useState(false);

  useEffect(() => {
    if (!window.isSecureContext) { setSupported(false); setNotSecure(true); return; }
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRClass) { setSupported(false); return; }
    srClassRef.current = SRClass;
  }, []);

  const start = () => {
    if (!srClassRef.current) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    const rec = new srClassRef.current();
    rec.lang            = 'ru-RU';
    rec.interimResults  = true;
    rec.continuous      = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(text);
    };
    rec.onend   = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      const label = SR_ERROR_LABELS[e.error] ?? `Ошибка: ${e.error}`;
      if (e.error !== 'no-speech') setError(label);
    };

    recognitionRef.current = rec;
    setTranscript('');
    setError(null);
    try { rec.start(); setListening(true); }
    catch { setError('Не удалось запустить распознавание. Попробуйте ещё раз.'); }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  return {
    supported, notSecure, listening, transcript, error, start, stop,
    reset: () => { setTranscript(''); setError(null); },
  };
};

// ─── Keyword maps ──────────────────────────────────────────────────────────────

/** Ключевые слова, однозначно указывающие на ДОХОД */
const INCOME_TRIGGERS = [
  'зарплат', 'аванс', 'получил', 'получила', 'пришло', 'заработал', 'заработала',
  'доход', 'подработ', 'фриланс', 'freelance', 'кэшбэк', 'cashback', 'выплат',
  'перевел', 'перевели', 'пополнение', 'продал', 'продала', 'дивиденд', 'бонус',
  'премия', 'стипенди', 'пенсия', 'пособие', 'возврат',
];

/** Карта категория → ключевые слова (РАСХОД). Порядок важен: первое совпадение побеждает. */
const EXPENSE_CATEGORY_MAP: Array<{ id: string; words: string[] }> = [
  // Подписки — раньше entertainment, чтобы "подписка netflix" → subscriptions
  { id: 'subscriptions', words: [
    'подписк', 'subscription', 'абонемент', 'автоплатёж', 'автоплатеж', 'ежемесячн',
  ]},
  { id: 'food', words: [
    'еда', 'продукт', 'обед', 'ужин', 'завтрак', 'перекус', 'кофе', 'coffee', 'чай',
    'ресторан', 'кафе', 'cafe', 'пицц', 'суши', 'sushi', 'бургер', 'burger', 'шаурм',
    'фастфуд', 'fastfood', 'доставк', 'мясо', 'хлеб', 'молоко', 'вкусно', 'поел',
    'поела', 'перекусил', 'латте', 'капучино', 'espresso', 'пекарн', 'пиво', 'вино',
    'супермаркет', 'пятёрочк', 'магнит', 'дикси', 'ашан', 'вкусвилл', 'додо', 'kfc',
  ]},
  { id: 'transport', words: [
    'такси', 'taxi', 'uber', 'болт', 'bolt', 'яндекс такси', 'метро', 'автобус',
    'маршрутк', 'троллейбус', 'трамвай', 'электричк', 'бензин', 'заправк',
    'парковк', 'каршеринг', 'самокат', 'проезд', 'транспорт',
    'газпромнефть', 'лукойл', 'bp ', 'shell',
    // Билеты только транспортные (авиа/жд/автобус) — "кино билеты" не должно сюда попасть:
    // совпадаем "билет" только вместе с транспортными словами (через контекст выше)
  ]},
  { id: 'housing', words: [
    'аренд', 'квартплат', 'коммунал', 'жкх', 'электричество', 'свет', 'газ ', 'вода ',
    'интернет', 'ростелеком', 'мгтс', 'ремонт', 'стройматериал',
    'ikea', 'леруа', 'мебель', 'хозяйств', 'хозтовар',
  ]},
  { id: 'health', words: [
    'аптек', 'pharmacy', 'лекарств', 'таблетк', 'витамин', 'врач', 'доктор',
    'поликлиник', 'клиник', 'больниц', 'анализ', 'стоматолог', 'зубн', 'медицин',
    'фитнес', 'спортзал', 'тренажёр', 'gym', 'массаж', 'психолог',
  ]},
  { id: 'entertainment', words: [
    'кино', 'cinema', 'театр', 'концерт', 'игр', 'game', 'steam', 'playstation',
    'netflix', 'okko', 'premier', 'kinopoisk', 'spotify', 'развлеч',
    'боулинг', 'бильярд', 'квест', 'аттракцион', 'вечеринк', 'бар ',
    'билет', // билеты на мероприятия (кино/театр) — после transport чтобы "такси билет" шёл в transport
  ]},
  { id: 'education', words: [
    'курс', 'обучени', 'учёба', 'книг', 'учебник', 'школ', 'университет',
    'skillfactory', 'skillbox', 'skyeng', 'stepik', 'coursera', 'udemy', 'урок',
    'репетитор', 'вебинар',
  ]},
  { id: 'shopping', words: [
    'одежд', 'обувь', 'кроссовк', 'пальто', 'куртк', 'футболк', 'wildberries',
    'ozon', 'озон', 'lamoda', 'zara', 'uniqlo', 'покупк', 'магазин',
    'рынок', 'подарок', 'сувенир', 'телефон', 'наушник', 'гаджет',
    'аксессуар', 'косметик', 'парфюм', 'декор',
  ]},
];

/** Карта категория → ключевые слова (ДОХОД) */
const INCOME_CATEGORY_MAP: Array<{ id: string; words: string[] }> = [
  { id: 'salary',    words: ['зарплат', 'аванс', 'оклад', 'выплат', 'заработал', 'бонус', 'премия'] },
  { id: 'freelance', words: ['фриланс', 'freelance', 'подработ', 'заказ', 'проект', 'клиент', 'стипенди'] },
  { id: 'cashback',  words: ['кэшбэк', 'cashback', 'возврат', 'кэш', 'бонусн', 'дивиденд'] },
  { id: 'other_inc', words: ['продал', 'продала', 'перевод', 'пришло', 'получил', 'доход', 'пенсия', 'пособие'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedVoiceTx {
  type: TxType;
  amount: number;
  title: string;
  category: string;
  /** true если тип определён однозначно по ключевым словам, false — угадан */
  typeConfident: boolean;
  /** true если категория определена однозначно */
  categoryConfident: boolean;
}

// ─── Core parser ──────────────────────────────────────────────────────────────

/** Умный парсер: определяет тип (расход/доход), категорию и сумму из произвольной фразы. */
export const parseVoiceTx = (raw: string): ParsedVoiceTx => {
  const text = raw.toLowerCase().trim();

  // 1. Извлекаем число (сумму)
  const numMatch = text.match(/\d[\d\s.,]*/);
  const amount = numMatch
    ? Math.round(Number(numMatch[0].replace(/[\s,]/g, '').replace(/\.\d*$/, ''))) || 0
    : 0;

  // 2. Очищаем текст от числа и стоп-слов → получаем заголовок
  const stopWords = /\b(потратил[а]?|потратить|заплатил[а]?|купил[а]?|получил[а]?|пришло|на|за|это|рублей|руб|ру|р\b|тысяч|тыс|к\b)\b/gi;
  const titleRaw = text
    .replace(/\d[\d\s.,]*/g, ' ')
    .replace(stopWords, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = titleRaw || 'Операция';

  // 3. Определяем тип: сначала ищем явные маркеры дохода
  const isIncomeTrigger = INCOME_TRIGGERS.some(kw => text.includes(kw));

  // Явные маркеры расхода перебивают доход, если присутствуют оба
  const isExpenseTrigger = /потратил|заплатил|купил|покупк|расход/.test(text);

  let type: TxType = 'expense';
  let typeConfident = false;

  if (isIncomeTrigger && !isExpenseTrigger) {
    type = 'income';
    typeConfident = true;
  } else if (isExpenseTrigger) {
    type = 'expense';
    typeConfident = true;
  }

  // 4. Определяем категорию из нужной карты
  const categoryMap = type === 'income' ? INCOME_CATEGORY_MAP : EXPENSE_CATEGORY_MAP;
  let category = type === 'income' ? 'other_inc' : 'other';
  let categoryConfident = false;

  for (const { id, words } of categoryMap) {
    if (words.some(kw => text.includes(kw))) {
      category = id;
      categoryConfident = true;
      break;
    }
  }

  // Если тип не определён но нашли категорию расхода — это расход
  if (!typeConfident && categoryConfident && type === 'expense') {
    typeConfident = true;
  }

  return { type, amount, title, category, typeConfident, categoryConfident };
};

/** Обратная совместимость со старым именем (используется в других местах) */
export const parseVoiceExpense = (text: string) => {
  const r = parseVoiceTx(text);
  return { amount: r.amount, title: r.title };
};
