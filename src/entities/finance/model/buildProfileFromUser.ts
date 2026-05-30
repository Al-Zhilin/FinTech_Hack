import type { FinancialProfile, User, AiInsight, Transaction, Goal } from '@/shared/types';
import { analyzeFinances, type FinanceAnalysis } from './financeAnalysis';
import { computeProfileFallbackBalance } from './dashboardReadiness';

function buildInsights(user: User): AiInsight[] {
  const recs = user.analysis?.recommendations ?? [];
  const types: AiInsight['type'][] = ['tip', 'warning', 'success', 'forecast'];
  return recs.slice(0, 4).map((text, i) => ({
    id: `rec_${i}`,
    type: types[i % types.length],
    title: text.length > 70 ? text.slice(0, 67) + '…' : text,
    body: text,
  }));
}

const EMPTY: FinancialProfile = {
  balance: 0,
  safeAmount: 0,
  healthScore: null,
  healthLabel: 'Нет данных',
  monthlyIncome: 0,
  monthlySpent: 0,
  monthlyBudget: 0,
  savingsRate: 0,
  stressScore: 50,
  categories: [],
  subscriptions: [],
  goals: [],
  recentExpenses: [],
  insights: [],
  upcomingPayments: [],
};

export function emptyFinanceAnalysis(): FinanceAnalysis {
  return analyzeFinances(null, [], [], 0, false);
}

export function buildProfileFromUser(
  user: User | null,
  txs: Transaction[] = [],
  goals: Goal[] = [],
  bankConnected = false,
): { profile: FinancialProfile; analysis: FinanceAnalysis } {
  if (!user) {
    const analysis = emptyFinanceAnalysis();
    return { profile: EMPTY, analysis };
  }

  const profileBalance = computeProfileFallbackBalance(user);
  const analysis = analyzeFinances(user, txs, goals, profileBalance, bankConnected);
  const { health, safeSpend, finance } = analysis;
  const healthScore = health.score ?? 0;

  const profile: FinancialProfile = {
    balance: safeSpend.totalBalance,
    safeAmount: safeSpend.safeAmount,
    healthScore: health.score,
    healthLabel: health.label,
    monthlyIncome: finance.income,
    monthlySpent: finance.expenses,
    monthlyBudget: finance.income,
    savingsRate: health.score != null
      ? health.savingsRate
      : finance.income > 0
        ? Math.round(((finance.income - finance.expenses) / finance.income) * 100)
        : 0,
    stressScore: health.score != null ? Math.max(0, 100 - healthScore) : 100,
    categories: [],
    subscriptions: [],
    goals: [],
    recentExpenses: [],
    insights: buildInsights(user),
    upcomingPayments: [],
  };

  return { profile, analysis };
}
