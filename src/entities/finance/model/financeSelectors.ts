import type { FinancePeriod, Transaction, TxType } from '@/shared/types';
import { getCategoryMeta } from './categoryMeta';

const WEEKDAYS = ['понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам', 'воскресеньям'];

export interface DateRange { from: Date; to: Date }

export const periodRange = (period: FinancePeriod, custom?: DateRange): DateRange => {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case 'day':   from.setHours(0, 0, 0, 0); break;
    case 'week':  from.setDate(to.getDate() - 6); from.setHours(0, 0, 0, 0); break;
    case 'month': from.setDate(to.getDate() - 29); from.setHours(0, 0, 0, 0); break;
    case 'year':  from.setDate(to.getDate() - 364); from.setHours(0, 0, 0, 0); break;
    case 'custom':
      if (custom) return custom;
      from.setDate(to.getDate() - 29);
  }
  return { from, to };
};

export const inRange = (t: Transaction, r: DateRange): boolean => {
  const d = +new Date(t.date);
  return d >= +r.from && d <= +r.to;
};

export interface Summary {
  income: number;
  expense: number;
  net: number;
}

export const summarize = (txs: Transaction[]): Summary => {
  let income = 0, expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
};

export interface CategorySlice {
  id: string;
  label: string;
  icon: string;
  color: string;
  amount: number;
  pct: number;          // доля от расходов
  count: number;
}

export const byCategory = (txs: Transaction[], type: TxType = 'expense'): CategorySlice[] => {
  const acc: Record<string, { amount: number; count: number }> = {};
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    (acc[t.category] ??= { amount: 0, count: 0 });
    acc[t.category].amount += t.amount;
    acc[t.category].count += 1;
    total += t.amount;
  }
  return Object.entries(acc)
    .map(([id, v]) => {
      const m = getCategoryMeta(id);
      return { id, label: m.label, icon: m.icon, color: m.color, amount: v.amount, count: v.count, pct: total ? (v.amount / total) * 100 : 0 };
    })
    .sort((a, b) => b.amount - a.amount);
};

export interface SeriesPoint { label: string; income: number; expense: number }

/** Раскладывает транзакции по бакетам в зависимости от периода (для графика). */
export const buildSeries = (txs: Transaction[], period: FinancePeriod, range: DateRange): SeriesPoint[] => {
  const points: { key: string; label: string; income: number; expense: number }[] = [];
  const idx: Record<string, number> = {};

  const push = (key: string, label: string) => {
    if (idx[key] === undefined) { idx[key] = points.length; points.push({ key, label, income: 0, expense: 0 }); }
    return idx[key];
  };

  // Предварительно создаём бакеты, чтобы пустые тоже были на графике
  if (period === 'year') {
    const cur = new Date(range.from);
    while (cur <= range.to) {
      push(`${cur.getFullYear()}-${cur.getMonth()}`, cur.toLocaleDateString('ru-RU', { month: 'short' }));
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    const cur = new Date(range.from);
    const dayLabel = period === 'week' || period === 'day'
      ? (d: Date) => d.toLocaleDateString('ru-RU', { weekday: 'short' })
      : (d: Date) => String(d.getDate());
    while (cur <= range.to) {
      push(cur.toISOString().slice(0, 10), dayLabel(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const t of txs) {
    const d = new Date(t.date);
    const key = period === 'year' ? `${d.getFullYear()}-${d.getMonth()}` : d.toISOString().slice(0, 10);
    if (idx[key] === undefined) continue;
    const p = points[idx[key]];
    if (t.type === 'income') p.income += t.amount; else p.expense += t.amount;
  }

  return points.map(({ label, income, expense }) => ({ label, income, expense }));
};

export interface WeekdayInsight {
  weekday: number;       // 0=Пн
  weekdayName: string;   // «пятницам»
  deltaPct: number;      // отклонение от среднего, %
  higher: boolean;
  text: string;
}

/** Находит день недели с самым большим отклонением расходов от среднего. */
export const weekdayInsight = (txs: Transaction[]): WeekdayInsight | null => {
  const sums = new Array(7).fill(0);
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const dow = (new Date(t.date).getDay() + 6) % 7;
    sums[dow] += t.amount;
  }
  // среднесуточные траты по каждому дню недели
  const weeksSpan = Math.max(1, txs.length ? span(txs) / 7 : 1);
  const perDay = sums.map(s => s / weeksSpan);
  const mean = perDay.reduce((a, b) => a + b, 0) / 7;
  if (mean <= 0) return null;

  let weekday = 0, best = 0;
  perDay.forEach((v, i) => {
    const dev = Math.abs(v - mean);
    if (dev > best) { best = dev; weekday = i; }
  });

  const deltaPct = Math.round(((perDay[weekday] - mean) / mean) * 100);
  if (Math.abs(deltaPct) < 10) return null;
  const higher = deltaPct > 0;
  return {
    weekday,
    weekdayName: WEEKDAYS[weekday],
    deltaPct: Math.abs(deltaPct),
    higher,
    text: `По ${WEEKDAYS[weekday]} вы тратите на ${Math.abs(deltaPct)}% ${higher ? 'больше' : 'меньше'} обычного`,
  };
};

const span = (txs: Transaction[]): number => {
  const dates = txs.map(t => +new Date(t.date));
  const days = (Math.max(...dates) - Math.min(...dates)) / 86_400_000;
  return Math.max(1, days);
};

// Текстовый вывод по структуре расходов для AI-комментария под блоком
export const spendingComment = (sum: Summary, top?: CategorySlice): string => {
  if (sum.expense === 0) return 'За этот период расходов не было.';
  const rate = sum.income > 0 ? Math.round((sum.net / sum.income) * 100) : 0;
  const topPart = top ? ` Больше всего — на «${top.label}» (${Math.round(top.pct)}%).` : '';
  if (sum.net < 0) return `Расходы превысили доход на ${Math.abs(sum.net).toLocaleString('ru-RU')} ₽.${topPart}`;
  return `Вы сохранили ${rate}% дохода за период.${topPart}`;
};
