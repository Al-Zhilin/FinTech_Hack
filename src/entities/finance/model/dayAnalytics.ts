import type { Transaction } from '@/shared/types';
import { getCategoryMeta } from './categoryMeta';

export interface DayAnalysis {
  spent: number;
  income: number;
  count: number;
  topCategory?: { label: string; icon: string; color: string; amount: number };
  biggest?: { title: string; icon: string; amount: number };
  cashShare: number;        // доля наличных в тратах, %
  avgDaily: number;         // средние траты в день за неделю
  deltaPct: number;         // отклонение от среднего, %
  rank: 'top' | 'low' | null;
  facts: string[];          // интересные наблюдения
}

const WEEKDAY_NAMES = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];

const dayBounds = (date: Date) => {
  const from = new Date(date); from.setHours(0, 0, 0, 0);
  const to = new Date(date); to.setHours(23, 59, 59, 999);
  return { from: +from, to: +to };
};

const spentOn = (txs: Transaction[], date: Date): number => {
  const { from, to } = dayBounds(date);
  let s = 0;
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const d = +new Date(t.date);
    if (d >= from && d <= to) s += t.amount;
  }
  return s;
};

export const analyzeDay = (txs: Transaction[], date: Date, weekDates: Date[]): DayAnalysis => {
  const { from, to } = dayBounds(date);
  const dayTx = txs.filter(t => {
    const d = +new Date(t.date);
    return d >= from && d <= to;
  });

  let spent = 0, income = 0, cash = 0;
  const byCat: Record<string, number> = {};
  let biggest: DayAnalysis['biggest'];
  for (const t of dayTx) {
    if (t.type === 'income') { income += t.amount; continue; }
    spent += t.amount;
    if (t.method === 'cash') cash += t.amount;
    byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
    if (!biggest || t.amount > biggest.amount) {
      biggest = { title: t.title, icon: getCategoryMeta(t.category).icon, amount: t.amount };
    }
  }

  const topId = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])[0];
  const topMeta = topId ? getCategoryMeta(topId) : null;
  const topCategory = topMeta ? { label: topMeta.label, icon: topMeta.icon, color: topMeta.color, amount: byCat[topId] } : undefined;

  // Контекст недели: средние траты и ранг дня (только прошедшие/сегодня дни)
  const now = Date.now();
  const pastDays = weekDates.filter(d => +dayBounds(d).from <= now);
  const spends = pastDays.map(d => spentOn(txs, d));
  const totalWeek = spends.reduce((a, b) => a + b, 0);
  const avgDaily = pastDays.length ? totalWeek / pastDays.length : 0;
  const deltaPct = avgDaily > 0 ? Math.round(((spent - avgDaily) / avgDaily) * 100) : 0;

  const maxSpend = Math.max(...spends, 0);
  const nonZero = spends.filter(s => s > 0);
  const minSpend = nonZero.length ? Math.min(...nonZero) : 0;
  let rank: DayAnalysis['rank'] = null;
  if (spent > 0 && spent === maxSpend && nonZero.length > 1) rank = 'top';
  else if (spent > 0 && spent === minSpend && nonZero.length > 1) rank = 'low';

  const cashShare = spent > 0 ? Math.round((cash / spent) * 100) : 0;
  const dow = (date.getDay() + 6) % 7;

  const facts: string[] = [];
  if (dayTx.length === 0) {
    facts.push('В этот день не было операций — кошелёк отдыхал 👌');
  } else {
    if (income > 0) facts.push(`Поступления: ${income.toLocaleString('ru-RU')} ₽`);
    if (avgDaily > 0 && spent > 0 && Math.abs(deltaPct) >= 10) {
      facts.push(`На ${Math.abs(deltaPct)}% ${deltaPct > 0 ? 'больше' : 'меньше'} среднего по неделе`);
    }
    if (rank === 'top') facts.push('Самый дорогой день недели 🔥');
    if (rank === 'low') facts.push('Самый экономный день недели 🏆');
    if (biggest) facts.push(`Крупнейшая трата: ${biggest.title} — ${biggest.amount.toLocaleString('ru-RU')} ₽`);
    if (cashShare >= 50) facts.push(`${cashShare}% потрачено наличными`);
    if (dow === 4 && deltaPct > 15) facts.push('Классика: по пятницам тратится больше');
  }

  return { spent, income, count: dayTx.length, topCategory, biggest, cashShare, avgDaily, deltaPct, rank, facts };
};

export const weekdayAccusative = (date: Date): string => WEEKDAY_NAMES[(date.getDay() + 6) % 7];
