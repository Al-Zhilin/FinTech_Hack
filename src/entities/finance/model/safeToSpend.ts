import type { Goal, Transaction, User } from '@/shared/types';
import { analyzeGoal, type GoalFinance } from '@/entities/goal/model/goalAnalysis';
import { computeCurrentBalance } from './dashboardReadiness';
import { periodRange, inRange } from './financeSelectors';

const MS_DAY = 86_400_000;

export interface UpcomingPayment {
  label: string;
  amount: number;
  daysUntil: number;
}

export interface SafeSpendResult {
  totalBalance: number;
  safeAmount: number;
  reserved: {
    mandatory: number;
    goals: number;
    credit: number;
  };
  upcoming: UpcomingPayment[];
}

function estimateCategoryDue(
  user: User | null,
  monthTx: Transaction[],
  category: string,
  defaultAmount: number,
  label: string,
  daysUntil: number,
): { due: number; item?: UpcomingPayment } {
  const paid = monthTx
    .filter(t => t.type === 'expense' && t.category === category)
    .reduce((s, t) => s + t.amount, 0);

  const expected = paid > 0
    ? paid
    : category === 'housing'
      ? (user?.monthlyExpenses ? Math.round(user.monthlyExpenses * 0.35) : defaultAmount)
      : defaultAmount;

  const due = Math.max(0, expected - paid);
  if (due <= 0) return { due: 0 };

  return {
    due,
    item: { label, amount: due, daysUntil },
  };
}

export function calculateSafeToSpend(
  user: User | null,
  txs: Transaction[],
  goals: Goal[],
  profileBalance: number,
  finance: GoalFinance,
): SafeSpendResult {
  const balance = computeCurrentBalance(txs, profileBalance);
  const monthRange = periodRange('month');
  const monthTx = txs.filter(t => inRange(t, monthRange));

  const credit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;
  const creditPaid = monthTx.some(t =>
    t.type === 'expense' &&
    (t.title.toLowerCase().includes('кредит') || t.title.toLowerCase().includes('долг')),
  );
  const creditDue = creditPaid ? 0 : credit;

  const housing = estimateCategoryDue(user, monthTx, 'housing', 5_000, 'Аренда / ЖКХ', 3);
  const subs = estimateCategoryDue(user, monthTx, 'subscriptions', 300, 'Подписки', 5);

  const mandatoryDue = housing.due + subs.due;
  const upcoming = [housing.item, subs.item].filter(Boolean) as UpcomingPayment[];
  if (creditDue > 0) {
    upcoming.push({ label: 'Кредит', amount: creditDue, daysUntil: 7 });
  }

  let goalsReserve = 0;
  const monthlyFree = Math.max(0, finance.income - finance.expenses);

  for (const goal of goals) {
    const ga = analyzeGoal(goal, finance);
    if (ga.status !== 'done') {
      const chunk = Math.min(
        ga.requiredMonthly,
        ga.remaining,
        monthlyFree > 0 ? Math.round(monthlyFree * 0.25) : ga.requiredMonthly,
      );
      goalsReserve += chunk;
    }
  }

  const afterObligations = Math.max(0, balance - creditDue - mandatoryDue);
  goalsReserve = Math.min(goalsReserve, Math.round(afterObligations * 0.6));

  const totalReserved = creditDue + mandatoryDue + goalsReserve;
  const safeAmount = Math.max(0, balance - totalReserved);

  return {
    totalBalance: balance,
    safeAmount,
    reserved: { mandatory: mandatoryDue, goals: goalsReserve, credit: creditDue },
    upcoming: upcoming.sort((a, b) => a.daysUntil - b.daysUntil),
  };
}

export function daysUntilSalary(user: User | null): number {
  const now = new Date();
  const day = now.getDate();
  const salaryDays = [1, 5, 10, 15, 20, 25];
  const next = salaryDays.find(d => d > day) ?? salaryDays[0];
  if (next > day) return next - day;
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return end - day + salaryDays[0];
}

export function dailySpendLimit(safeAmount: number, daysLeft: number): number {
  return Math.max(0, Math.floor(safeAmount / Math.max(1, daysLeft)));
}

export function daysLeftInMonth(): number {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / MS_DAY));
}
