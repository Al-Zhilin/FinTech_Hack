import type { Goal, Transaction, User } from '@/shared/types';
import type { GoalFinance } from '@/entities/goal/model/goalAnalysis';
import { calculateFinancialHealth, type FinancialHealthResult } from './financialHealth';
import { calculateSafeToSpend, dailySpendLimit, daysUntilSalary, type SafeSpendResult } from './safeToSpend';
import { buildFinanceMicroInsights, type MicroInsight } from './financeMicroInsights';
import { computeCurrentBalance } from './dashboardReadiness';
import { byCategory, periodRange, inRange, summarize, weekdayInsight } from './financeSelectors';
import { formatCurrency } from '@/shared/lib/formatters';

export type DataQuality = 'none' | 'partial' | 'full';

export interface TodayRecommendation {
  title: string;
  body: string;
}

export interface BalanceSummary {
  hint: string;
  totalBalance: number;
  safeAmount: number;
}

export interface FinanceAnalysis {
  health: FinancialHealthResult;
  safeSpend: SafeSpendResult;
  recommendation: TodayRecommendation;
  balanceSummary: BalanceSummary;
  topInsight: MicroInsight | null;
  finance: GoalFinance;
  dataQuality: DataQuality;
}

function getDataQuality(txs: Transaction[], bankConnected: boolean): DataQuality {
  if (txs.length === 0) return 'none';
  if (bankConnected || txs.length >= 5) return 'full';
  return 'partial';
}

function buildFinance(user: User | null, txs: Transaction[], profileBalance: number): GoalFinance {
  const monthRange = periodRange('month');
  const monthTx = txs.filter(t => inRange(t, monthRange));
  const sum = summarize(monthTx);
  const credit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;

  return {
    income: sum.income > 0 ? sum.income : (user?.income ?? 0),
    expenses: sum.expense > 0 ? sum.expense : (user?.monthlyExpenses ?? 0) + credit,
  };
}

function buildBalanceSummary(
  safe: SafeSpendResult,
  bankConnected: boolean,
  dataQuality: DataQuality,
): BalanceSummary {
  const { totalBalance, safeAmount } = safe;

  if (dataQuality === 'none' && !bankConnected) {
    return {
      hint: 'Подключи банк — операции и анализ загрузятся автоматически',
      totalBalance,
      safeAmount,
    };
  }

  if (totalBalance === 0) {
    return {
      hint: 'Остаток нулевой — проверь данные или добавь доход',
      totalBalance,
      safeAmount,
    };
  }

  const reserved = totalBalance - safeAmount;
  if (reserved > 0 && safeAmount < totalBalance) {
    return {
      hint: `Из ${formatCurrency(totalBalance, true)} безопасно потратить ${formatCurrency(safeAmount, true)} — остальное на обязательные платежи и цели`,
      totalBalance,
      safeAmount,
    };
  }

  if (safeAmount <= 0 && totalBalance > 0) {
    return {
      hint: `На счёте ${formatCurrency(totalBalance, true)}, но после обязательных платежей свободных денег нет`,
      totalBalance,
      safeAmount,
    };
  }

  return {
    hint: dataQuality === 'partial'
      ? 'Предварительный расчёт по имеющимся операциям'
      : 'Карты и наличные по вашим операциям',
    totalBalance,
    safeAmount,
  };
}

function buildTodayRecommendation(
  user: User | null,
  txs: Transaction[],
  health: FinancialHealthResult,
  safe: SafeSpendResult,
  finance: GoalFinance,
  microInsights: MicroInsight[],
  dataQuality: DataQuality,
): TodayRecommendation {
  if (dataQuality === 'none') {
    return {
      title: 'Подключи банк',
      body: 'Загрузим операции за 3 месяца — и сразу покажем, сколько можно тратить и что улучшить.',
    };
  }

  const daysToSalary = daysUntilSalary(user);
  const dailyLimit = dailySpendLimit(safe.safeAmount, daysToSalary);

  if (daysToSalary <= 7 && dailyLimit < 800 && safe.safeAmount > 0) {
    return {
      title: 'Режим экономии до зарплаты',
      body: `До зарплаты ${daysToSalary} дн. — лимит ${formatCurrency(dailyLimit, true)} в день. Сейчас безопасно потратить ${formatCurrency(safe.safeAmount, true)}.`,
    };
  }

  if (safe.safeAmount <= 0 && safe.totalBalance > 0 && safe.upcoming.length > 0) {
    const next = safe.upcoming[0];
    return {
      title: 'Деньги зарезервированы',
      body: `Через ${next.daysUntil} дн. — ${next.label} (${formatCurrency(next.amount, true)}). Не трать сверх ${formatCurrency(safe.totalBalance, true)} на счёте.`,
    };
  }

  if (health.status === 'critical') {
    return {
      title: 'Режим экономии',
      body: `Индекс ${health.score}/100. Расходы ${formatCurrency(health.inputs.expenses, true)} при доходе ${formatCurrency(health.inputs.income, true)}. ${health.aiAction}`,
    };
  }

  if (health.status === 'tense') {
    return {
      title: 'Сократи импульсные траты',
      body: `Индекс ${health.score}/100, подушка ~${health.survivalDays} дн. ${health.aiAction}`,
    };
  }

  const monthRange = periodRange('month');
  const monthTx = txs.filter(t => inRange(t, monthRange) && t.type === 'expense');
  const cats = byCategory(monthTx, 'expense');
  const top = cats[0];

  if (top && finance.income > 0 && top.amount > finance.income * 0.35) {
    return {
      title: `Проверь «${top.label}»`,
      body: `На «${top.label}» ушло ${formatCurrency(top.amount, true)} (${Math.round(top.pct)}% расходов). Это главная статья — есть где поджать.`,
    };
  }

  const weekday = weekdayInsight(txs);
  if (weekday && weekday.higher) {
    return {
      title: 'Паттерн трат',
      body: `${weekday.text}. Планируй покупки заранее в эти дни.`,
    };
  }

  if (microInsights.length > 0) {
    const m = microInsights[0];
    return { title: m.emoji === '🎉' ? 'Так держать!' : 'Заметили паттерн', body: m.text };
  }

  if (health.savingsRate >= 20) {
    return {
      title: 'Отложи 5% дохода',
      body: `Копишь ${health.savingsRate}% дохода — отлично. Можно отложить ещё ~${formatCurrency(Math.round(finance.income * 0.05), true)} сегодня.`,
    };
  }

  const credit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;
  if (credit > 0) {
    const free = Math.max(0, finance.income - finance.expenses);
    return {
      title: 'Сфокусируйся на долге',
      body: `Кредит ${formatCurrency(credit, true)}/мес. Свободно ~${formatCurrency(free, true)} — направь на досрочное погашение.`,
    };
  }

  if (health.status === 'excellent') {
    return { title: 'Следующий уровень', body: health.aiAction };
  }

  return {
    title: 'Под контролем',
    body: `Индекс ${health.score}/100. Безопасно потратить ${formatCurrency(safe.safeAmount, true)}. ${health.aiAction}`,
  };
}

export function analyzeFinances(
  user: User | null,
  txs: Transaction[],
  goals: Goal[],
  profileBalance: number,
  bankConnected: boolean,
): FinanceAnalysis {
  const balance = computeCurrentBalance(txs, profileBalance);
  const finance = buildFinance(user, txs, profileBalance);
  const dataQuality = getDataQuality(txs, bankConnected);

  const safeSpend = calculateSafeToSpend(user, txs, goals, profileBalance, finance);
  const health = calculateFinancialHealth(user, txs, profileBalance, bankConnected, safeSpend.safeAmount);
  const microInsights = buildFinanceMicroInsights(txs, user, safeSpend);

  return {
    health,
    safeSpend,
    recommendation: buildTodayRecommendation(user, txs, health, safeSpend, finance, microInsights, dataQuality),
    balanceSummary: buildBalanceSummary(safeSpend, bankConnected, dataQuality),
    topInsight: microInsights[0] ?? null,
    finance,
    dataQuality,
  };
}
