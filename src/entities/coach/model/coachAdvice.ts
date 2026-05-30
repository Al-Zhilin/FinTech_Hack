import type { User, FinancialProfile } from '@/shared/types';
import type { PlanStep } from './coachStore';

// ─── Генерируем персонализированный план на неделю ──────────────────────────

export interface CoachContext {
  greeting: string;
  priorityLabel: string;
  priorityStep: PlanStep;
  steps: PlanStep[];
  observation: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  tip: string;
}

const fmtRub = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

export function buildCoachContext(
  user: User | null,
  profile: FinancialProfile,
  arenaStreak: number,
  _arenaCoins: number,
  txCount: number,
): CoachContext {
  const name       = user?.name?.split(' ')[0] ?? 'Друг';
  const income     = user?.income ?? profile.monthlyIncome;
  const expenses   = user?.monthlyExpenses ?? profile.monthlySpent;
  const freeCash   = income - expenses;
  const savingsRate = income > 0 ? Math.round((freeCash / income) * 100) : 0;
  const health     = Math.max(0, 100 - profile.stressScore);
  const noData     = txCount === 0;
  const hasCredits = user?.hasCredits ?? false;
  const hasCushion = user?.hasCushion ?? false;
  const goals      = profile.goals;
  const closestGoal = [...goals].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )[0];

  // ── Определяем главный приоритет ──────────────────────────────────────────
  let urgency: CoachContext['urgency'] = 'medium';
  let priorityLabel = 'Приоритет недели';
  let observation   = '';
  let tip           = '';

  // Нет данных → первый шаг
  if (noData) {
    urgency = 'high';
    priorityLabel = 'С чего начать';
    observation = `${name}, я вижу что данных пока нет. Давай начнём с самого простого — добавь одну операцию вручную или подключи банк.`;
    tip = 'Первая операция открывает всю аналитику. Это займёт 30 секунд.';
  }
  // Критический стресс
  else if (health <= 30) {
    urgency = 'critical';
    priorityLabel = '🚨 Требует внимания';
    observation = `${name}, твой финансовый индекс ${health}/100 — это критическая зона. Расходы превышают норму. Действуем вместе прямо сейчас.`;
    tip = 'Сократи 3 статьи расходов этой недели — и индекс пойдёт вверх.';
  }
  // Нет подушки безопасности
  else if (!hasCushion && income > 0) {
    urgency = 'high';
    priorityLabel = '⚡ Срочно создать';
    observation = `${name}, у тебя нет подушки безопасности. Это значит — любой форс-мажор приведёт к долгу. Начнём откладывать прямо сейчас.`;
    tip = `Идеал — 3–6 месяцев расходов (${fmtRub(expenses * 3)}). Начни с первых ${fmtRub(Math.min(5000, freeCash / 2))}.`;
  }
  // Есть кредиты, большие
  else if (hasCredits && (user?.creditAmount ?? 0) > income * 0.4) {
    urgency = 'high';
    priorityLabel = '💳 Закрыть долги';
    observation = `${name}, платежи по кредитам занимают более 40% дохода — это давление на весь бюджет. Давай найдём, как снизить нагрузку.`;
    tip = 'Даже +5 000₽ к платежу ежемесячно закроет кредит на несколько месяцев раньше.';
  }
  // Низкая норма сбережений
  else if (savingsRate < 10 && income > 0) {
    urgency = 'medium';
    priorityLabel = '💰 Поднять сбережения';
    observation = `${name}, ты откладываешь только ${savingsRate}% дохода. Рекомендую 20%. Давай найдём где урезать без боли.`;
    tip = 'Правило «сначала заплати себе»: переводи нужную сумму сразу в день зарплаты.';
  }
  // Цель близко к дедлайну
  else if (closestGoal) {
    const monthsLeft = Math.max(1, Math.round(
      (new Date(closestGoal.deadline).getTime() - Date.now()) / (30 * 24 * 3600 * 1000)
    ));
    const needed = (closestGoal.target - closestGoal.current) / monthsLeft;
    urgency = needed > freeCash ? 'high' : 'medium';
    priorityLabel = '🎯 Ускорить цель';
    observation = `${name}, до цели «${closestGoal.title}» осталось ${fmtRub(closestGoal.target - closestGoal.current)}. Нужно ${fmtRub(Math.round(needed))}/мес — ${needed > freeCash ? 'чуть больше свободных денег. Разберёмся' : 'это реально'}.`;
    tip = `При текущем темпе цель закроется ${needed <= freeCash ? 'вовремя' : 'с задержкой'}. Я покажу, как ускорить.`;
  }
  // Всё хорошо → рост
  else {
    urgency = 'low';
    priorityLabel = '🚀 Масштабирование';
    observation = `${name}, финансы в хорошей форме (${health}/100)! Самое время думать об инвестициях и увеличении капитала.`;
    tip = 'При текущем темпе сбережений за 5 лет накопится внушительная сумма. Давай считать.';
  }

  // ── Генерируем план шагов (5–7 конкретных действий) ────────────────────
  const steps: PlanStep[] = [];

  // 1. Данные
  if (noData) {
    steps.push({
      id: 'add_first_tx', icon: '➕', priority: 'high', category: 'spending', done: false,
      text: 'Добавь первую операцию',
      detail: 'Запиши любую трату вручную — это откроет весь анализ расходов',
      route: '/finance', action: 'Открыть Финансы',
    });
    steps.push({
      id: 'connect_bank', icon: '🏦', priority: 'high', category: 'spending', done: false,
      text: 'Подключи банк',
      detail: 'Загрузим операции за 3 месяца автоматически — не надо ничего вводить вручную',
      route: '/finance', action: 'Подключить банк',
    });
  } else {
    // Анализ расходов
    steps.push({
      id: 'check_cats', icon: '📊', priority: 'medium', category: 'spending', done: false,
      text: 'Проверь структуру расходов',
      detail: 'Открой Финансы → раздел категорий. Найди категорию, которую можно урезать на 10–20%',
      route: '/finance', action: 'Открыть Финансы',
    });
  }

  // 2. Подушка
  if (!hasCushion) {
    steps.push({
      id: 'create_cushion', icon: '🛡️', priority: 'high', category: 'savings', done: false,
      text: 'Создай подушку безопасности',
      detail: `Открой отдельный накопительный счёт. Первый взнос — хотя бы ${fmtRub(Math.min(5000, Math.max(1000, Math.round(freeCash * 0.3))))}`,
      route: '/analytics', action: 'Рассчитать',
    });
  }

  // 3. Цель
  if (closestGoal) {
    steps.push({
      id: 'goal_topup', icon: '🎯', priority: 'medium', category: 'goals', done: false,
      text: `Пополни цель «${closestGoal.title}»`,
      detail: `Прямо сейчас переведи хотя бы ${fmtRub(Math.round((closestGoal.target - closestGoal.current) / 12))} на накопления`,
      route: '/goals', action: 'К целям',
    });
  } else {
    steps.push({
      id: 'set_goal', icon: '🎯', priority: 'medium', category: 'goals', done: false,
      text: 'Поставь финансовую цель',
      detail: 'С конкретной целью копить в 2 раза проще. Займёт 2 минуты.',
      route: '/goals', action: 'Создать цель',
    });
  }

  // 4. Кредиты
  if (hasCredits) {
    steps.push({
      id: 'check_refi', icon: '💳', priority: 'medium', category: 'spending', done: false,
      text: 'Проверь возможность рефинансирования',
      detail: 'Рассчитай: возможно, снизить ставку и платёж реально прямо сейчас',
      route: '/analytics', action: 'Калькулятор',
    });
  }

  // 5. Норма сбережений
  if (savingsRate < 20 && income > 0) {
    const target = Math.round(income * 0.2);
    steps.push({
      id: 'raise_savings', icon: '💰', priority: savingsRate < 5 ? 'high' : 'medium', category: 'savings', done: false,
      text: `Начни откладывать ${fmtRub(target)}/мес`,
      detail: `20% от дохода — это ${fmtRub(target)}. Настрой автоперевод в день зарплаты`,
      route: '/goals', action: 'К целям',
    });
  }

  // 6. Арена (геймификация)
  if (arenaStreak === 0) {
    steps.push({
      id: 'start_streak', icon: '🐾', priority: 'low', category: 'arena', done: false,
      text: 'Загляни к КопиКоту сегодня',
      detail: 'Начни серию ежедневных визитов — КопиКот скучает и у него есть монеты для тебя',
      route: '/arena', action: 'В Арену',
    });
  } else if (arenaStreak < 7) {
    steps.push({
      id: 'grow_streak', icon: '🔥', priority: 'low', category: 'arena', done: false,
      text: `Продолжи серию — уже ${arenaStreak} дней`,
      detail: 'Сыграй квиз или просто зайди — серия должна расти каждый день',
      route: '/arena', action: 'В Арену',
    });
  }

  // 7. Обучение
  steps.push({
    id: 'read_insight', icon: '📚', priority: 'low', category: 'learning', done: false,
    text: 'Прочти один финансовый совет',
    detail: 'Займёт 1 минуту. На Дашборде и в разделе Финансы есть персональные инсайты',
    route: '/dashboard', action: 'На Главную',
  });

  // Сортируем по приоритету
  const order = { high: 0, medium: 1, low: 2 };
  steps.sort((a, b) => order[a.priority] - order[b.priority]);

  const priorityStep = steps[0];

  // ── Приветствие ───────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер';
  const greeting = `${timeGreet}, ${name}! Давай разберёмся с финансами шаг за шагом.`;

  return {
    greeting,
    priorityLabel,
    priorityStep,
    steps,
    observation,
    urgency,
    tip,
  };
}
