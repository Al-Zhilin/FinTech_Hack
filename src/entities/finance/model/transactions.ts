import type { Transaction } from '@/shared/types';

// Детерминированный ГПСЧ, чтобы данные были стабильны между рендерами/сессиями.
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

interface ExpenseTemplate {
  category: string;
  titles: string[];
  min: number;
  max: number;
  perWeek: number;     // примерная частота в неделю
  weekdayBias?: number[]; // множители по дням недели (0=Пн..6=Вс)
}

// Пятница (idx 4) намеренно «дороже» — рождает инсайт «по пятницам больше».
const FRIDAY_HEAVY = [0.8, 0.85, 0.9, 1.0, 1.55, 1.3, 1.1];
const WEEKEND_HEAVY = [0.7, 0.75, 0.8, 0.85, 1.1, 1.6, 1.5];

const EXPENSE_TEMPLATES: ExpenseTemplate[] = [
  { category: 'food',          titles: ['ВкусВилл', 'Пятёрочка', 'Самокат', 'Кофейня', 'Сбермаркет', 'Доставка обеда'], min: 250, max: 2600, perWeek: 6, weekdayBias: FRIDAY_HEAVY },
  { category: 'transport',     titles: ['Яндекс Такси', 'Метро', 'Самокат GO', 'АЗС', 'Каршеринг'], min: 80, max: 1500, perWeek: 4 },
  { category: 'shopping',      titles: ['Wildberries', 'Ozon', 'Zara', 'DNS', 'Спортмастер'], min: 700, max: 9000, perWeek: 1.5, weekdayBias: WEEKEND_HEAVY },
  { category: 'entertainment', titles: ['Кино', 'Бар', 'Ресторан', 'Концерт', 'Боулинг'], min: 600, max: 5000, perWeek: 1.2, weekdayBias: WEEKEND_HEAVY },
  { category: 'health',        titles: ['Аптека', 'Стоматология', 'Анализы', 'Фитнес'], min: 400, max: 4000, perWeek: 0.8 },
  { category: 'housing',       titles: ['Аренда', 'ЖКХ', 'Интернет'], min: 1500, max: 25000, perWeek: 0.3 },
];

const SUBSCRIPTIONS = [
  { title: 'Яндекс Плюс', amount: 399, day: 10 },
  { title: 'Spotify', amount: 299, day: 8 },
  { title: 'Netflix', amount: 799, day: 15 },
  { title: 'ChatGPT Plus', amount: 1800, day: 18 },
];

const iso = (d: Date) => d.toISOString();

/** Генерирует транзакции за последние `days` дней. */
export const generateTransactions = (days = 365): Transaction[] => {
  const rnd = mulberry32(20260530);
  const txs: Transaction[] = [];
  const today = new Date();
  today.setHours(20, 0, 0, 0);
  let id = 0;
  const nid = () => `tx_${++id}`;

  for (let back = days; back >= 0; back--) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    const dow = (d.getDay() + 6) % 7; // 0=Пн

    // Доход: зарплата 5-го и аванс 20-го числа
    if (d.getDate() === 5) {
      txs.push({ id: nid(), type: 'income', amount: 78_000, category: 'salary', title: 'Зарплата', date: iso(d), method: 'card' });
    }
    if (d.getDate() === 20) {
      txs.push({ id: nid(), type: 'income', amount: 42_000, category: 'salary', title: 'Аванс', date: iso(d), method: 'card' });
    }
    // Случайная подработка ~раз в месяц
    if (rnd() < 0.04) {
      txs.push({ id: nid(), type: 'income', amount: 5_000 + Math.round(rnd() * 25_000), category: 'freelance', title: 'Подработка', date: iso(d), method: 'card' });
    }

    // Подписки
    for (const s of SUBSCRIPTIONS) {
      if (d.getDate() === s.day) {
        txs.push({ id: nid(), type: 'expense', amount: s.amount, category: 'subscriptions', title: s.title, merchant: s.title, date: iso(d), method: 'card' });
      }
    }

    // Расходы по шаблонам
    for (const t of EXPENSE_TEMPLATES) {
      const bias = t.weekdayBias?.[dow] ?? 1;
      const prob = (t.perWeek / 7) * bias;
      if (rnd() < prob) {
        const base = t.min + rnd() * (t.max - t.min);
        const amount = Math.round((base * bias) / 10) * 10;
        const title = t.titles[Math.floor(rnd() * t.titles.length)];
        const method: Transaction['method'] = t.category === 'food' && rnd() < 0.3 ? 'cash' : 'card';
        txs.push({ id: nid(), type: 'expense', amount, category: t.category, title, merchant: title, date: iso(d), method });
      }
    }
  }

  return txs.sort((a, b) => +new Date(b.date) - +new Date(a.date));
};

export const MOCK_TRANSACTIONS = generateTransactions(365);

// ── Профиль 2: «Накопитель» — высокий доход, умеренные траты, активное сбережение
const SAVER_EXPENSE_TEMPLATES: ExpenseTemplate[] = [
  { category: 'food',          titles: ['Магнит', 'ВкусВилл', 'Столовая', 'Перекрёсток', 'Домашняя еда'], min: 150, max: 1200, perWeek: 5 },
  { category: 'transport',     titles: ['Метро', 'Автобус', 'Самокат GO', 'Ситимобил'], min: 50, max: 600, perWeek: 6 },
  { category: 'shopping',      titles: ['Wildberries', 'Fix Price', 'Леруа Мерлен', 'Decathlon'], min: 500, max: 4000, perWeek: 0.8 },
  { category: 'entertainment', titles: ['Кинотеатр', 'Книжный', 'Музей', 'Парк'], min: 300, max: 1500, perWeek: 0.5 },
  { category: 'health',        titles: ['Аптека', 'Фитнес Клуб', 'Анализы', 'Бассейн'], min: 300, max: 2500, perWeek: 1.2 },
  { category: 'education',     titles: ['Coursera', 'Skillbox', 'Книги', 'Курс английского'], min: 500, max: 3000, perWeek: 0.4 },
  { category: 'housing',       titles: ['Аренда', 'ЖКХ', 'Интернет', 'Телефон'], min: 1000, max: 22000, perWeek: 0.3 },
];

const SAVER_SUBSCRIPTIONS = [
  { title: 'Яндекс Плюс', amount: 399, day: 10 },
  { title: 'Антивирус', amount: 199, day: 5 },
];

/** Генерирует транзакции профиля «Накопитель» — высокий доход, умеренные траты */
export const generateSaverTransactions = (days = 90): Transaction[] => {
  const rnd = mulberry32(20261001);
  const txs: Transaction[] = [];
  const today = new Date();
  today.setHours(20, 0, 0, 0);
  let id = 0;
  const nid = () => `tx_saver_${++id}`;

  for (let back = days; back >= 0; back--) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    const dow = (d.getDay() + 6) % 7;

    // Высокий доход: зарплата 5-го и 20-го (выше, т.к. IT-специалист)
    if (d.getDate() === 5) {
      txs.push({ id: nid(), type: 'income', amount: 140_000, category: 'salary', title: 'Зарплата', date: iso(d), method: 'card' });
    }
    if (d.getDate() === 20) {
      txs.push({ id: nid(), type: 'income', amount: 60_000, category: 'salary', title: 'Аванс', date: iso(d), method: 'card' });
    }
    // Фриланс проекты ~раз в 2 недели
    if (rnd() < 0.08) {
      txs.push({ id: nid(), type: 'income', amount: 15_000 + Math.round(rnd() * 35_000), category: 'freelance', title: 'Фриланс-проект', date: iso(d), method: 'card' });
    }
    // Инвестиционные доходы ~раз в месяц
    if (rnd() < 0.03) {
      txs.push({ id: nid(), type: 'income', amount: 3_000 + Math.round(rnd() * 12_000), category: 'cashback', title: 'Дивиденды / Кэшбэк', date: iso(d), method: 'card' });
    }

    // Подписки
    for (const s of SAVER_SUBSCRIPTIONS) {
      if (d.getDate() === s.day) {
        txs.push({ id: nid(), type: 'expense', amount: s.amount, category: 'subscriptions', title: s.title, merchant: s.title, date: iso(d), method: 'card' });
      }
    }

    // Расходы — умеренные
    for (const t of SAVER_EXPENSE_TEMPLATES) {
      const bias = t.weekdayBias?.[dow] ?? 1;
      const prob = (t.perWeek / 7) * bias;
      if (rnd() < prob) {
        const base   = t.min + rnd() * (t.max - t.min);
        const amount = Math.round((base * 0.75) / 10) * 10; // умеренные траты
        const title  = t.titles[Math.floor(rnd() * t.titles.length)];
        txs.push({ id: nid(), type: 'expense', amount, category: t.category, title, merchant: title, date: iso(d), method: 'card' });
      }
    }
  }

  return txs.sort((a, b) => +new Date(b.date) - +new Date(a.date));
};
