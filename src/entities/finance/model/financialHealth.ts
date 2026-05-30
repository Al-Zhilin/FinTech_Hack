import type { Transaction, User } from '@/shared/types';
import { periodRange, inRange, summarize } from './financeSelectors';
import { computeCurrentBalance } from './dashboardReadiness';

export const HEALTH_MIN_TX = 5;

const MS_DAY = 86_400_000;
const MANDATORY_CATEGORIES = new Set(['housing', 'subscriptions']);

export interface HealthInputs {
  income: number;
  expenses: number;
  mandatory: number;
  debtPayments: number;
  balance: number;
}

export type HealthStatusId = 'collecting' | 'critical' | 'tense' | 'controlled' | 'excellent';

export type HealthConfidence = 'none' | 'partial' | 'full';

export interface HealthBreakdown {
  savings: number;
  debt: number;
  cushion: number;
}

export interface FinancialHealthResult {
  status: HealthStatusId;
  label: string;
  color: string;
  emoji: string;
  score: number | null;
  progress: number;
  confidence: HealthConfidence;
  breakdown: HealthBreakdown | null;
  savingsRate: number;
  debtRatio: number;
  survivalDays: number;
  aiAction: string;
  inputs: HealthInputs;
  summary: string;
}

export function gatherHealthInputs(
  user: User | null,
  txs: Transaction[],
  profileBalance: number,
): HealthInputs {
  const monthRange = periodRange('month');
  const monthTx = txs.filter(t => inRange(t, monthRange));
  const sum = summarize(monthTx);

  const credit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;

  const income = sum.income > 0 ? sum.income : (user?.income ?? 0);
  const expenses = sum.expense > 0 ? sum.expense : (user?.monthlyExpenses ?? 0) + credit;
  const debtPayments = credit;

  let mandatory = monthTx
    .filter(t => t.type === 'expense' && MANDATORY_CATEGORIES.has(t.category))
    .reduce((s, t) => s + t.amount, 0);

  if (mandatory === 0) {
    const obligatory = user?.quiz?.obligatoryCategories ?? [];
    if (obligatory.length > 0 && expenses > 0) {
      mandatory = Math.round(expenses * Math.min(0.7, obligatory.length * 0.12));
    } else if (debtPayments > 0) {
      mandatory = debtPayments + Math.round(Math.max(0, expenses - debtPayments) * 0.35);
    } else if (expenses > 0) {
      mandatory = Math.round(expenses * 0.4);
    } else if (income > 0) {
      mandatory = Math.round(income * 0.35);
    }
  }

  mandatory = Math.max(mandatory, 1);

  const balance = computeCurrentBalance(txs, profileBalance);

  return { income, expenses, mandatory, debtPayments, balance };
}

function scoreSavings(income: number, expenses: number): { points: number; rate: number } {
  if (income <= 0) return { points: 0, rate: 0 };
  const rate = ((income - expenses) / income) * 100;
  if (rate >= 20) return { points: 40, rate };
  if (rate >= 1) return { points: 20, rate };
  return { points: 0, rate };
}

function scoreDebt(debtPayments: number, income: number): { points: number; ratio: number } {
  if (income <= 0) return { points: debtPayments === 0 ? 30 : 0, ratio: 100 };
  const ratio = (debtPayments / income) * 100;
  if (ratio === 0) return { points: 30, ratio: 0 };
  if (ratio <= 30) return { points: 15, ratio };
  return { points: 0, ratio };
}

function scoreCushion(balance: number, mandatory: number): { points: number; days: number } {
  const daily = mandatory / 30;
  if (daily <= 0) return { points: balance > 0 ? 15 : 0, days: 0 };
  const days = balance / daily;
  if (days >= 30) return { points: 30, days };
  if (days >= 14) return { points: 15, days };
  return { points: 0, days };
}

function resolveStatus(score: number): Pick<FinancialHealthResult, 'status' | 'label' | 'color' | 'emoji' | 'aiAction'> {
  if (score <= 30) {
    return {
      status: 'critical',
      label: 'Критическое',
      color: 'text-danger',
      emoji: '🔴',
      aiAction: 'Сократите необязательные траты и отмените лишние подписки.',
    };
  }
  if (score <= 60) {
    return {
      status: 'tense',
      label: 'Напряжённое',
      color: 'text-warning',
      emoji: '🟡',
      aiAction: 'Деньги часто уходят в ноль — найдите 1–2 категории для экономии.',
    };
  }
  if (score <= 80) {
    return {
      status: 'controlled',
      label: 'Под контролем',
      color: 'text-success',
      emoji: '🟢',
      aiAction: 'Стабильная ситуация — продолжайте копить.',
    };
  }
  return {
    status: 'excellent',
    label: 'Отличное',
    color: 'text-success',
    emoji: '💚',
    aiAction: 'Можно ставить более серьёзные цели или думать об инвестициях.',
  };
}

function hasAnalyzableData(inputs: HealthInputs, txCount: number): boolean {
  return txCount > 0 || inputs.income > 0 || inputs.balance > 0 || inputs.expenses > 0;
}

function getConfidence(txCount: number, bankConnected: boolean): HealthConfidence {
  if (txCount === 0) return 'none';
  if (bankConnected || txCount >= HEALTH_MIN_TX) return 'full';
  return 'partial';
}

function reconcileScoreWithSpendable(
  score: number,
  totalBalance: number,
  spendable: number,
): number {
  if (totalBalance <= 0 && spendable <= 0) {
    return Math.min(score, 25);
  }
  if (spendable <= 0 && totalBalance > 0) {
    return Math.min(score, 50);
  }
  if (totalBalance > 0) {
    const ratio = spendable / totalBalance;
    if (ratio < 0.05) return Math.min(score, 45);
    if (ratio < 0.15) return Math.min(score, 60);
    if (ratio < 0.3) return Math.min(score, 75);
  }
  return score;
}

export function calculateFinancialHealth(
  user: User | null,
  txs: Transaction[],
  profileBalance = 0,
  bankConnected = false,
  spendableBalance?: number,
): FinancialHealthResult {
  const inputs = gatherHealthInputs(user, txs, profileBalance);
  const txCount = txs.length;
  const confidence = getConfidence(txCount, bankConnected);
  const progress = Math.min(100, Math.round((txCount / HEALTH_MIN_TX) * 100));
  const cushionBalance = spendableBalance ?? inputs.balance;

  if (!hasAnalyzableData(inputs, txCount)) {
    return {
      status: 'collecting',
      label: 'Нет данных',
      color: 'text-white/90',
      emoji: '👋',
      score: null,
      progress: 0,
      confidence: 'none',
      breakdown: null,
      savingsRate: 0,
      debtRatio: 0,
      survivalDays: 0,
      aiAction: 'Подключите банк или добавьте операции — тогда рассчитаем индекс.',
      inputs,
      summary: 'Нет данных для расчёта — подключите банк или добавьте операции.',
    };
  }

  const { points: savings, rate: savingsRate } = scoreSavings(inputs.income, inputs.expenses);
  const { points: debt, ratio: debtRatio } = scoreDebt(inputs.debtPayments, inputs.income);
  const { points: cushion, days: survivalDays } = scoreCushion(cushionBalance, inputs.mandatory);
  let score = savings + debt + cushion;
  const roundedRate = Math.round(savingsRate);
  const roundedSurvival = Math.round(survivalDays);

  score = reconcileScoreWithSpendable(score, inputs.balance, cushionBalance);

  const statusResolved = resolveStatus(score);

  return {
    ...statusResolved,
    score,
    progress: confidence === 'full' ? 100 : progress,
    confidence,
    breakdown: { savings, debt, cushion },
    savingsRate: roundedRate,
    debtRatio: Math.round(debtRatio),
    survivalDays: roundedSurvival,
    summary: buildCoherentSummary(inputs, score, roundedRate, roundedSurvival, cushionBalance, confidence),
    inputs,
  };
}

function buildCoherentSummary(
  inputs: HealthInputs,
  score: number,
  savingsRate: number,
  survivalDays: number,
  spendable: number,
  confidence: HealthConfidence,
): string {
  const prefix = confidence === 'partial' ? 'Предварительно: ' : '';
  const saved = Math.max(0, inputs.income - inputs.expenses);

  if (inputs.income <= 0 && inputs.balance <= 0) {
    return 'Нет данных — подключите банк или добавьте операции.';
  }
  if (spendable <= 0 && inputs.balance > 0) {
    return `${prefix}на счёте ${inputs.balance.toLocaleString('ru-RU')} ₽, но свободных ${spendable.toLocaleString('ru-RU')} ₽ · индекс ${score}`;
  }
  if (saved < 0) {
    return `${prefix}расходы превышают доход на ${Math.abs(saved).toLocaleString('ru-RU')} ₽ · индекс ${score}`;
  }
  return `${prefix}копите ${savingsRate}% · подушка ~${survivalDays} дн. · свободно ${spendable.toLocaleString('ru-RU')} ₽ · индекс ${score}/100`;
}
