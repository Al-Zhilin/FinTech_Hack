import type { Transaction, User } from '@/shared/types';
import type { SafeSpendResult } from './safeToSpend';
import { daysUntilSalary, dailySpendLimit } from './safeToSpend';
import { periodRange, inRange } from './financeSelectors';

const MS_DAY = 86_400_000;

export type MicroInsightTone = 'tip' | 'celebration' | 'warning';

export interface MicroInsight {
  id: string;
  tone: MicroInsightTone;
  emoji: string;
  text: string;
}

const COFFEE_RE    = /кофе|coffee|латте|latte|капучино|espresso|americano/i;
const FASTFOOD_RE  = /фаст|fast|бургер|mcdonald|kfc|додо|dodo|шаурм|пицц|burger/i;
const TAXI_RE      = /яндекс.такси|uber|bolt|такси|taxi/i;
const ENTERTAIN_RE = /кино|cinema|театр|concert|концерт|Netflix|spotify|okko|premier|стрим/i;
const SUBS_RE      = /подписка|subscription|monthly|premium|pro\b/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function weekRange(offsetWeeks: number) {
  const to = new Date();
  to.setDate(to.getDate() - offsetWeeks * 7);
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function monthRange(offsetMonths: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  const to   = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function sumInRange(
  txs: Transaction[],
  from: Date,
  to: Date,
  filter: (t: Transaction) => boolean,
): number {
  return txs.reduce((s, t) => {
    const d = +new Date(t.date);
    if (d < +from || d > +to || t.type !== 'expense' || !filter(t)) return s;
    return s + t.amount;
  }, 0);
}

function countInRange(
  txs: Transaction[],
  from: Date,
  to: Date,
  filter: (t: Transaction) => boolean,
): number {
  return txs.filter(t => {
    const d = +new Date(t.date);
    return d >= +from && d <= +to && t.type === 'expense' && filter(t);
  }).length;
}

function daysSinceLastMatch(txs: Transaction[], match: (t: Transaction) => boolean): number | null {
  const hits = txs
    .filter(t => t.type === 'expense' && match(t))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  if (hits.length === 0) return null;
  return Math.floor((Date.now() - +new Date(hits[0].date)) / MS_DAY);
}

export function daysWord(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'дней';
  if (b > 1 && b < 5) return 'дня';
  if (b === 1) return 'день';
  return 'дней';
}

function fmtRub(v: number): string {
  return v.toLocaleString('ru-RU') + ' ₽';
}

// ─── Individual insight generators ────────────────────────────────────────────

function salaryInsight(user: User | null, safe: SafeSpendResult): MicroInsight | null {
  const days = daysUntilSalary(user);
  if (days > 10) return null;
  const limit = dailySpendLimit(safe.safeAmount, days);
  if (limit <= 0) {
    return { id: 'salary_critical', tone: 'warning', emoji: '⚠️',
      text: `До зарплаты ${days} ${daysWord(days)}, а безопасный остаток на нуле. Пора включить режим экономии.` };
  }
  if (days <= 7 && limit < 800) {
    return { id: 'salary_limit', tone: 'warning', emoji: '⚠️',
      text: `До зарплаты ${days} ${daysWord(days)} — твой дневной лимит сократился до ${fmtRub(limit)}. Держи себя в руках!` };
  }
  if (days <= 3) {
    return { id: 'salary_soon', tone: 'tip', emoji: '🎉',
      text: `Зарплата уже через ${days} ${daysWord(days)}! Самое время спланировать, куда направить её первым делом.` };
  }
  return null;
}

function coffeeInsight(txs: Transaction[]): MicroInsight | null {
  const thisWeek = weekRange(0);
  const lastWeek = weekRange(1);

  const thisSum = sumInRange(txs, thisWeek.from, thisWeek.to, t => t.category === 'food' && COFFEE_RE.test(t.title));
  const lastSum = sumInRange(txs, lastWeek.from, lastWeek.to, t => t.category === 'food' && COFFEE_RE.test(t.title));

  if (thisSum === 0 && lastSum === 0) {
    const foodThis = sumInRange(txs, thisWeek.from, thisWeek.to, t => t.category === 'food');
    const foodLast = sumInRange(txs, lastWeek.from, lastWeek.to, t => t.category === 'food');
    if (foodThis === 0 || foodLast === 0) return null;
    const pct = Math.round(((foodThis - foodLast) / foodLast) * 100);
    if (Math.abs(pct) < 15) return null;
    if (pct > 0) {
      return { id: 'food_week', tone: 'tip', emoji: '💡',
        text: `На этой неделе ты потратил на еду на ${pct}% больше, чем на прошлой (${fmtRub(foodThis)} vs ${fmtRub(foodLast)}). Стоит проверить импульсивные заходы.` };
    }
    return { id: 'food_week_down', tone: 'celebration', emoji: '🎉',
      text: `На этой неделе расходы на еду ниже на ${Math.abs(pct)}% — ${fmtRub(foodThis)} вместо ${fmtRub(foodLast)}. Отличная дисциплина!` };
  }

  if (lastSum === 0 && thisSum > 0) return null;
  const pct = lastSum > 0 ? Math.round(((thisSum - lastSum) / lastSum) * 100) : 100;
  if (pct <= 15) return null;

  return { id: 'coffee_week', tone: 'tip', emoji: '☕',
    text: `На кофе на этой неделе ты потратил на ${pct}% больше, чем на прошлой (${fmtRub(thisSum)}). Может, кофе дома иногда?` };
}

function fastfoodInsight(txs: Transaction[]): MicroInsight | null {
  const days = daysSinceLastMatch(txs, t => t.category === 'food' && FASTFOOD_RE.test(t.title));
  if (days === null) {
    const anyFoodDays = daysSinceLastMatch(txs, t => t.category === 'food' && t.amount > 800);
    if (anyFoodDays !== null && anyFoodDays >= 3) {
      return { id: 'no_fastfood', tone: 'celebration', emoji: '🥗',
        text: `Уже ${anyFoodDays} ${daysWord(anyFoodDays)} без крупных трат на еду вне дома. Так держать!` };
    }
    return null;
  }
  if (days >= 3) {
    return { id: 'fastfood_streak', tone: 'celebration', emoji: '🎉',
      text: `Ты уже ${days} ${daysWord(days)} не тратил на фастфуд — молодец! Продолжай в том же духе.` };
  }
  return null;
}

function taxiInsight(txs: Transaction[]): MicroInsight | null {
  const cur  = monthRange(0);
  const prev = monthRange(1);
  const curSum  = sumInRange(txs, cur.from, cur.to, t => t.category === 'transport' && TAXI_RE.test(t.title));
  const prevSum = sumInRange(txs, prev.from, prev.to, t => t.category === 'transport' && TAXI_RE.test(t.title));
  const curCount  = countInRange(txs, cur.from, cur.to, t => t.category === 'transport' && TAXI_RE.test(t.title));

  if (curSum === 0) return null;
  if (prevSum > 0) {
    const pct = Math.round(((curSum - prevSum) / prevSum) * 100);
    if (pct > 25) {
      return { id: 'taxi_up', tone: 'tip', emoji: '🚕',
        text: `Такси в этом месяце: ${fmtRub(curSum)} — на ${pct}% больше прошлого. Это ${curCount} поездок. Возможно, стоит чаще использовать общественный транспорт?` };
    }
    if (pct < -20) {
      return { id: 'taxi_down', tone: 'celebration', emoji: '🚇',
        text: `Расходы на такси снизились на ${Math.abs(pct)}% по сравнению с прошлым месяцем. Сэкономил ${fmtRub(prevSum - curSum)}!` };
    }
  } else if (curSum > 3000) {
    return { id: 'taxi_first', tone: 'tip', emoji: '🚕',
      text: `В этом месяце на такси ушло ${fmtRub(curSum)} (${curCount} поездок). Это заметная статья трат — стоит учитывать.` };
  }
  return null;
}

function entertainmentInsight(txs: Transaction[]): MicroInsight | null {
  const cur  = monthRange(0);
  const prev = monthRange(1);
  const curSum  = sumInRange(txs, cur.from, cur.to, t => t.category === 'entertainment' || ENTERTAIN_RE.test(t.title));
  const prevSum = sumInRange(txs, prev.from, prev.to, t => t.category === 'entertainment' || ENTERTAIN_RE.test(t.title));

  if (curSum === 0) return null;
  if (prevSum > 0) {
    const pct = Math.round(((curSum - prevSum) / prevSum) * 100);
    if (pct > 40) {
      return { id: 'ent_up', tone: 'warning', emoji: '🎭',
        text: `Развлечения в этом месяце обошлись в ${fmtRub(curSum)} — на ${pct}% больше прошлого. Хорошо отдыхаешь? 😄` };
    }
  }
  return null;
}

function subscriptionInsight(txs: Transaction[]): MicroInsight | null {
  const cur = monthRange(0);
  const subsTxs = txs.filter(t => {
    const d = +new Date(t.date);
    return d >= +cur.from && d <= +cur.to && t.type === 'expense' && SUBS_RE.test(t.title);
  });
  if (subsTxs.length < 2) return null;
  const total = subsTxs.reduce((s, t) => s + t.amount, 0);
  return { id: 'subs', tone: 'tip', emoji: '📱',
    text: `В этом месяце ${subsTxs.length} подписки на общую сумму ${fmtRub(total)}. Все пользуешься? Стоит провести ревизию.` };
}

function monthOverMonthInsight(txs: Transaction[]): MicroInsight | null {
  const cur  = monthRange(0);
  const prev = monthRange(1);
  const curExp  = sumInRange(txs, cur.from, cur.to, () => true);
  const prevExp = sumInRange(txs, prev.from, prev.to, () => true);
  if (curExp === 0 || prevExp === 0) return null;
  const pct = Math.round(((curExp - prevExp) / prevExp) * 100);
  const diff = Math.abs(curExp - prevExp);
  if (pct > 20) {
    return { id: 'mom_up', tone: 'warning', emoji: '📈',
      text: `Общие расходы этого месяца выше прошлого на ${pct}% (+${fmtRub(diff)}). Хорошо бы разобраться, что выросло.` };
  }
  if (pct < -15) {
    return { id: 'mom_down', tone: 'celebration', emoji: '📉',
      text: `Расходы этого месяца на ${Math.abs(pct)}% ниже прошлого — сэкономил ${fmtRub(diff)}. Так держать!` };
  }
  return null;
}

function largeTransactionInsight(txs: Transaction[]): MicroInsight | null {
  const cur = monthRange(0);
  const large = txs.filter(t => {
    const d = +new Date(t.date);
    return d >= +cur.from && d <= +cur.to && t.type === 'expense' && t.amount > 10000;
  }).sort((a, b) => b.amount - a.amount);
  if (large.length === 0) return null;
  const top = large[0];
  return { id: 'large_tx', tone: 'tip', emoji: '💸',
    text: `Крупнейшая трата месяца: «${top.title}» — ${fmtRub(top.amount)}. Это была запланированная покупка или внезапная?` };
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export function buildFinanceMicroInsights(
  txs: Transaction[],
  user: User | null,
  safeSpend: SafeSpendResult,
): MicroInsight[] {
  const monthRng = periodRange('month');
  const recentTx = txs.filter(t => inRange(t, monthRng));

  const candidates = [
    salaryInsight(user, safeSpend),
    coffeeInsight(txs),
    fastfoodInsight(txs),
    taxiInsight(txs),
    entertainmentInsight(txs),
    subscriptionInsight(txs),
    monthOverMonthInsight(txs),
    largeTransactionInsight(txs),
  ].filter(Boolean) as MicroInsight[];

  if (candidates.length === 0 && safeSpend.upcoming.length > 0) {
    const next = safeSpend.upcoming[0];
    candidates.push({
      id: 'upcoming', tone: 'tip', emoji: '📅',
      text: `Через ${next.daysUntil} ${daysWord(next.daysUntil)} — «${next.label}» (${fmtRub(next.amount)}). Учитывай при тратах.`,
    });
  }

  if (candidates.length === 0 && recentTx.length === 0) {
    candidates.push({
      id: 'start', tone: 'tip', emoji: '💡',
      text: 'Запиши первую покупку — и я начну подсказывать, где можно сэкономить.',
    });
  }

  // Дедупликация по id
  const seen = new Set<string>();
  return candidates.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).slice(0, 4); // показываем до 4 микроинсайтов
}
