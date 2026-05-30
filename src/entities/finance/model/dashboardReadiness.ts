import type { Transaction, User } from '@/shared/types';
import { periodRange, inRange, summarize } from './financeSelectors';

export const FORECAST_UNLOCK_MIN_TX = 5;
const MS_DAY = 86_400_000;
const BALANCE_WINDOW_DAYS = 45;

export interface DashboardContext {
  txCount: number;
  expenseCount: number;
  currentBalance: number;
  hasIncome: boolean;
  isNewUser: boolean;
  forecastUnlocked: boolean;
  forecastRemaining: number;
}

/** Баланс кошелька: накопленный итог по операциям (или профиль, если операций нет). */
export function computeCurrentBalance(
  txs: Transaction[],
  profileBalance: number,
): number {
  if (txs.length === 0) return profileBalance;

  const sorted = [...txs].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date),
  );

  const cutoff = Date.now() - BALANCE_WINDOW_DAYS * MS_DAY;
  const inWindow = sorted.filter(t => +new Date(t.date) >= cutoff);

  const sum = (list: Transaction[]) =>
    list.reduce(
      (acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount),
      0,
    );

  if (inWindow.length > 0) {
    return sum(inWindow);
  }

  return sum(sorted);
}

export function computeProfileFallbackBalance(user: User | null): number {
  if (!user) return 0;
  const credit = user.hasCredits ? (user.creditAmount ?? 0) : 0;
  return Math.max(0, (user.income ?? 0) - (user.monthlyExpenses ?? 0) - credit);
}

export function getDashboardContext(
  txs: Transaction[],
  profileBalance: number,
  user: User | null,
): DashboardContext {
  const txCount = txs.length;
  const expenseCount = txs.filter(t => t.type === 'expense').length;
  const currentBalance = computeCurrentBalance(txs, profileBalance);
  const hasIncome = (user?.income ?? 0) > 0;
  const isNewUser = txCount === 0 || (txCount < 3 && currentBalance === 0);
  const forecastRemaining = Math.max(0, FORECAST_UNLOCK_MIN_TX - expenseCount);

  return {
    txCount,
    expenseCount,
    currentBalance,
    hasIncome,
    isNewUser,
    forecastUnlocked: expenseCount >= FORECAST_UNLOCK_MIN_TX,
    forecastRemaining,
  };
}

/** Доход/расход за текущий месяц из операций с fallback на профиль. */
export function resolveMonthlyFlow(
  user: User | null,
  txs: Transaction[],
): { income: number; expenses: number } {
  const monthRange = periodRange('month');
  const monthTx = txs.filter(t => inRange(t, monthRange));
  const sum = summarize(monthTx);
  const credit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;

  return {
    income: sum.income > 0 ? sum.income : (user?.income ?? 0),
    expenses: sum.expense > 0 ? sum.expense : (user?.monthlyExpenses ?? 0) + credit,
  };
}
