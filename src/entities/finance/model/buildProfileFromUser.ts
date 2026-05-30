import type { FinancialProfile, User, AiInsight } from '@/shared/types';

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

export function buildProfileFromUser(user: User | null): FinancialProfile {
  if (!user) return EMPTY;

  const income = user.income ?? 0;
  const expenses = user.monthlyExpenses ?? 0;
  const credit = user.hasCredits ? (user.creditAmount ?? 0) : 0;
  const free = Math.max(0, income - expenses - credit);
  const savingsRate = income > 0 ? Math.round((free / income) * 100) : 0;
  const healthScore = user.analysis?.healthScore ?? 50;

  return {
    balance: free,
    monthlyIncome: income,
    monthlySpent: expenses + credit,
    monthlyBudget: income,
    savingsRate,
    stressScore: Math.max(0, 100 - healthScore),
    categories: [],
    subscriptions: [],
    goals: [],
    recentExpenses: [],
    insights: buildInsights(user),
    upcomingPayments: [],
  };
}
