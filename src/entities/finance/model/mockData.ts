import type { FinancialProfile } from '@/shared/types';

// ─── Mock Financial Profile ────────────────────────────────────────────────────
// All data is static for now. When backend is ready, replace with API calls.

export const MOCK_FINANCE: FinancialProfile = {
  balance: 87_430,
  monthlyIncome: 120_000,
  monthlySpent: 68_200,
  monthlyBudget: 90_000,
  savingsRate: 24,
  stressScore: 42, // 0-100, lower is better

  categories: [
    { category: 'food',           label: 'Еда',           amount: 18_400, budget: 20_000, color: '#FF6B6B', icon: '🍔' },
    { category: 'housing',        label: 'Жильё',         amount: 25_000, budget: 25_000, color: '#6C63FF', icon: '🏠' },
    { category: 'transport',      label: 'Транспорт',     amount: 5_600,  budget: 8_000,  color: '#4ECDC4', icon: '🚗' },
    { category: 'shopping',       label: 'Покупки',       amount: 9_200,  budget: 12_000, color: '#FFE66D', icon: '🛍️' },
    { category: 'subscriptions',  label: 'Подписки',      amount: 4_100,  budget: 4_000,  color: '#F38181', icon: '📱' },
    { category: 'health',         label: 'Здоровье',      amount: 2_400,  budget: 5_000,  color: '#95E1D3', icon: '💊' },
    { category: 'entertainment',  label: 'Развлечения',   amount: 3_500,  budget: 6_000,  color: '#F8A5C2', icon: '🎬' },
  ],

  subscriptions: [
    { id: 's1', title: 'Яндекс Плюс',  amount: 399,  nextDate: '2026-06-10', category: 'subscriptions', icon: '🎵', color: '#FFCC00' },
    { id: 's2', title: 'Spotify',       amount: 299,  nextDate: '2026-06-08', category: 'subscriptions', icon: '🎧', color: '#1DB954' },
    { id: 's3', title: 'Netflix',       amount: 799,  nextDate: '2026-06-15', category: 'subscriptions', icon: '🎬', color: '#E50914' },
    { id: 's4', title: 'iCloud 50GB',   amount: 59,   nextDate: '2026-06-20', category: 'subscriptions', icon: '☁️', color: '#007AFF' },
    { id: 's5', title: 'ChatGPT Plus',  amount: 1_800, nextDate: '2026-06-18', category: 'subscriptions', icon: '🤖', color: '#00A67E' },
  ],

  goals: [
    { id: 'g1', title: 'Отпуск в Турции',   target: 120_000, current: 54_000, deadline: '2026-07-01', color: '#E8856A', icon: '✈️' },
    { id: 'g2', title: 'Подушка безопасности', target: 360_000, current: 87_430, deadline: '2026-12-31', color: '#B87EFF', icon: '🛡️' },
    { id: 'g3', title: 'Новый ноутбук',      target: 85_000,  current: 30_000, deadline: '2026-08-01', color: '#34C759', icon: '💻' },
  ],

  recentExpenses: [
    { id: 'e1', title: 'ВкусВилл',       amount: 2_340, category: 'food',          date: '2025-05-27', merchant: 'ВкусВилл' },
    { id: 'e2', title: 'Яндекс Такси',   amount: 450,   category: 'transport',     date: '2025-05-27', merchant: 'Yandex' },
    { id: 'e3', title: 'Wildberries',    amount: 3_200, category: 'shopping',      date: '2025-05-26', merchant: 'WB' },
    { id: 'e4', title: 'Сбермаркет',     amount: 1_890, category: 'food',          date: '2025-05-26', merchant: 'Сбер' },
    { id: 'e5', title: 'Кино Планета',   amount: 600,   category: 'entertainment', date: '2025-05-25', merchant: 'Кино' },
    { id: 'e6', title: 'Аптека 36.6',    amount: 1_200, category: 'health',        date: '2025-05-25', merchant: 'Аптека' },
  ],

  insights: [
    {
      id: 'i1',
      type: 'warning',
      title: 'Перерасход на подписки',
      body: 'В этом месяце подписки превысили бюджет на 100 ₽. Проверь, все ли нужны.',
      action: 'Управлять',
    },
    {
      id: 'i2',
      type: 'success',
      title: 'Рестораны –18%',
      body: 'Вы сократили траты на рестораны на 18% по сравнению с прошлым месяцем.',
    },
    {
      id: 'i3',
      type: 'forecast',
      title: '⚠️ Риск перерасхода',
      body: 'При текущем темпе через 12 дней возможен перерасход бюджета.',
      action: 'Посмотреть',
    },
    {
      id: 'i4',
      type: 'tip',
      title: 'Готовь дома 2×/неделю',
      body: 'Расходы на еду выросли на 40%. Готовя дома 2 раза в неделю, сэкономишь ~3 000 ₽.',
    },
  ],

  upcomingPayments: [
    { id: 's2', title: 'Spotify',     amount: 299,   nextDate: '2026-06-08', category: 'subscriptions', icon: '🎧', color: '#1DB954' },
    { id: 's1', title: 'Яндекс Плюс', amount: 399,  nextDate: '2026-06-10', category: 'subscriptions', icon: '🎵', color: '#FFCC00' },
    { id: 's3', title: 'Netflix',     amount: 799,   nextDate: '2026-06-15', category: 'subscriptions', icon: '🎬', color: '#E50914' },
  ],
};
