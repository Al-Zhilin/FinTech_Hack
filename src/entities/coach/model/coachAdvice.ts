import type { User, FinancialProfile } from '@/shared/types';
import type { PlanStep } from './coachStore';

export interface QuickAction {
  icon: string;
  label: string;
  route: string;
  desc: string;
}

export interface CoachContext {
  greeting: string;
  priorityLabel: string;
  priorityStep: PlanStep;
  steps: PlanStep[];
  observation: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  tip: string;
  quickActions: QuickAction[];
}

const fmtRub = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

// ─── Правила для кредитных рекомендаций ─────────────────────────────────────
//
//  health = 100 − stressScore
//  critical  (health ≤ 30): никаких новых кредитов, никакого калькулятора.
//                            Если есть долг с нагрузкой > 40% — предлагаем
//                            рефинансирование чтобы СНИЗИТЬ платёж.
//  high      (health ≤ 50): калькулятор скрыт, рефинансирование только при
//                            высокой долговой нагрузке.
//  medium/low (health > 50): рефинансирование при наличии кредитов — норма.
//  good       (health > 70): можно предложить кредит на крупную цель.
//
//  create_cushion ВСЕГДА ведёт в Финансы (накопления), а не в калькулятор.
// ─────────────────────────────────────────────────────────────────────────────

export function buildCoachContext(
  user: User | null,
  profile: FinancialProfile,
  arenaStreak: number,
  _arenaCoins: number,
  txCount: number,
): CoachContext {
  const name         = user?.name?.split(' ')[0] ?? 'Друг';
  const income       = user?.income ?? profile.monthlyIncome;
  const expenses     = user?.monthlyExpenses ?? profile.monthlySpent;
  const freeCash     = income - expenses;
  const savingsRate  = income > 0 ? Math.round((freeCash / income) * 100) : 0;
  const health       = Math.max(0, 100 - profile.stressScore);
  const noData       = txCount === 0;
  const hasCredits   = user?.hasCredits ?? false;
  const hasCushion   = user?.hasCushion ?? false;
  const creditAmount = user?.creditAmount ?? 0;
  const goals        = profile.goals;
  const closestGoal  = [...goals].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  )[0];

  // Пороговые флаги
  const isCritical   = health <= 30;   // расходы ≥ доходов или близко
  const isHighStress = health <= 50;   // напряжённо, но не критично
  const isGood       = health > 70;    // всё хорошо
  const highCreditLoad = hasCredits && creditAmount > income * 0.4;

  // ── Приоритет и наблюдение ───────────────────────────────────────────────
  let urgency: CoachContext['urgency'] = 'medium';
  let priorityLabel = 'Приоритет недели';
  let observation   = '';
  let tip           = '';

  if (noData) {
    urgency = 'high';
    priorityLabel = 'С чего начать';
    observation = `${name}, данных пока нет — давай начнём. Добавь одну операцию вручную или подключи банк.`;
    tip = 'Первая операция открывает всю аналитику. Это займёт 30 секунд.';

  } else if (isCritical) {
    urgency = 'critical';
    priorityLabel = '🚨 Требует внимания';
    observation = `${name}, финансовый индекс ${health}/100 — критическая зона. Расходы поглощают весь доход. Сейчас важно остановить отток, а не брать новые обязательства.`;
    tip = 'Не бери новых кредитов и рассрочек — сначала найди 3 статьи расходов для сокращения. Даже −5 000 ₽/мес изменят ситуацию.';

  } else if (!hasCushion && income > 0) {
    urgency = 'high';
    priorityLabel = '⚡ Срочно создать';
    observation = `${name}, у тебя нет подушки безопасности. Любой форс-мажор превратится в долг. Начнём копить — без кредитов.`;
    const cushionGoal = fmtRub(expenses * 3);
    const firstStep   = fmtRub(Math.min(5000, Math.max(1000, freeCash > 0 ? Math.round(freeCash * 0.3) : 1000)));
    tip = `Подушка — это накопления, не кредит. Цель: ${cushionGoal} (3 мес. расходов). Начни с ${firstStep} прямо сейчас.`;

  } else if (highCreditLoad) {
    urgency = 'high';
    priorityLabel = '💳 Снизить долговую нагрузку';
    observation = `${name}, кредиты занимают больше 40% дохода — бюджет под постоянным давлением. Нужно снизить ежемесячный платёж или ускорить погашение.`;
    tip = 'Рефинансирование под более низкую ставку освободит деньги уже в следующем месяце. Рассчитай в калькуляторе.';

  } else if (savingsRate < 10 && income > 0) {
    urgency = 'medium';
    priorityLabel = '💰 Поднять сбережения';
    observation = `${name}, ты откладываешь ${savingsRate}% дохода. Рекомендую 20%. Найдём, где урезать без боли.`;
    tip = 'Правило «сначала заплати себе»: в день зарплаты сразу переводи нужную сумму на накопительный счёт.';

  } else if (closestGoal) {
    const monthsLeft = Math.max(1, Math.round(
      (new Date(closestGoal.deadline).getTime() - Date.now()) / (30 * 24 * 3600 * 1000),
    ));
    const needed = (closestGoal.target - closestGoal.current) / monthsLeft;
    urgency = needed > freeCash ? 'high' : 'medium';
    priorityLabel = '🎯 Ускорить цель';
    observation = `${name}, до «${closestGoal.title}» осталось ${fmtRub(closestGoal.target - closestGoal.current)}. Нужно ${fmtRub(Math.round(needed))}/мес — ${needed > freeCash ? 'чуть больше свободных. Разберёмся' : 'это реально'}.`;
    tip = `При текущем темпе цель закроется ${needed <= freeCash ? 'вовремя' : 'с задержкой'}. Я покажу, как ускорить.`;

  } else {
    urgency = 'low';
    priorityLabel = '🚀 Масштабирование';
    observation = `${name}, финансы в хорошей форме (${health}/100)! Самое время думать об инвестициях и росте капитала.`;
    tip = 'При текущем темпе за 5 лет накопится внушительная сумма. Можно также рассмотреть выгодный кредит на крупную цель.';
  }

  // ── Шаги плана ───────────────────────────────────────────────────────────
  const steps: PlanStep[] = [];

  // 1. Данные — всегда в приоритете при их отсутствии
  if (noData) {
    steps.push({
      id: 'add_first_tx', icon: '➕', priority: 'high', category: 'spending', done: false,
      text: 'Добавь первую операцию',
      detail: 'Запиши любую трату вручную — откроется весь анализ расходов',
      route: '/finance', action: 'Открыть Финансы',
    });
    steps.push({
      id: 'connect_bank', icon: '🏦', priority: 'high', category: 'spending', done: false,
      text: 'Подключи банк',
      detail: 'Операции загрузятся автоматически — вводить ничего не нужно',
      route: '/finance', action: 'Подключить банк',
    });
  } else {
    // Анализ расходов — при критическом состоянии повышаем приоритет и меняем формулировку
    steps.push({
      id: 'check_cats', icon: '📊',
      priority: isCritical ? 'high' : 'medium',
      category: 'spending', done: false,
      text: isCritical
        ? 'Найди статьи расходов для сокращения'
        : 'Проверь структуру расходов',
      detail: isCritical
        ? 'Открой Финансы → категории. Выбери 2–3 статьи, которые можно урезать прямо сейчас'
        : 'Открой Финансы → категории. Найди категорию, которую можно урезать на 10–20%',
      route: '/finance', action: 'Открыть Финансы',
    });
  }

  // 2. Подушка безопасности
  // — не предлагаем копить при критическом состоянии (сначала нужно остановить потери)
  // — маршрут ВСЕГДА в Финансы, не в кредитный калькулятор
  if (!hasCushion && !isCritical) {
    const firstContrib = freeCash > 1000
      ? Math.min(5000, Math.round(freeCash * 0.3))
      : 1000;
    steps.push({
      id: 'create_cushion', icon: '🛡️', priority: 'high', category: 'savings', done: false,
      text: 'Создай подушку безопасности',
      detail: `Открой накопительную цель и откладывай регулярно. Первый взнос — хотя бы ${fmtRub(firstContrib)}`,
      route: '/finance', action: 'К финансам',
    });
  }

  // 3. Кредиты — логика строго зависит от здоровья
  if (hasCredits) {
    if (isCritical && highCreditLoad) {
      // Критическое + высокая нагрузка: рефинансирование чтобы СНИЗИТЬ платёж
      steps.push({
        id: 'check_refi', icon: '💳', priority: 'high', category: 'spending', done: false,
        text: 'Рефинансируй кредит — снизь ежемесячный платёж',
        detail: 'Пересмотр ставки или объединение кредитов освободит деньги уже со следующего месяца',
        route: '/analytics', action: 'Рассчитать',
      });
    } else if (!isCritical) {
      // Нормальное состояние: проверить варианты оптимизации
      steps.push({
        id: 'check_refi', icon: '💳', priority: 'medium', category: 'spending', done: false,
        text: 'Проверь возможность рефинансирования',
        detail: 'Возможно, снизить ставку и платёж реально прямо сейчас',
        route: '/analytics', action: 'Калькулятор',
      });
    }
    // При критическом состоянии без высокой нагрузки — не показываем кредитный шаг
  }

  // 4. Цели — только при стабильных финансах
  if (!isCritical) {
    if (closestGoal) {
      steps.push({
        id: 'goal_topup', icon: '🎯', priority: 'medium', category: 'goals', done: false,
        text: `Пополни цель «${closestGoal.title}»`,
        detail: `Переведи хотя бы ${fmtRub(Math.round((closestGoal.target - closestGoal.current) / 12))} на накопления`,
        route: '/finance', action: 'К финансам',
      });
    } else if (isGood) {
      // Предлагаем поставить цель только когда финансы в хорошей форме
      steps.push({
        id: 'set_goal', icon: '🎯', priority: 'medium', category: 'goals', done: false,
        text: 'Поставь финансовую цель',
        detail: 'С конкретной целью копить в 2 раза проще. Займёт 2 минуты.',
        route: '/finance', action: 'К финансам',
      });
    }
  }

  // 5. Поднять норму сбережений — только если есть реальные свободные деньги
  if (savingsRate < 20 && income > 0 && freeCash > 0 && !isCritical) {
    const target = Math.round(income * 0.2);
    steps.push({
      id: 'raise_savings', icon: '💰',
      priority: savingsRate < 5 ? 'high' : 'medium',
      category: 'savings', done: false,
      text: `Начни откладывать ${fmtRub(target)}/мес`,
      detail: `20% от дохода — это ${fmtRub(target)}. Настрой автоперевод в день зарплаты`,
      route: '/finance', action: 'К финансам',
    });
  }

  // 6. Арена
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

  // 7. Обучение — всегда последним
  steps.push({
    id: 'read_insight', icon: '📚', priority: 'low', category: 'learning', done: false,
    text: 'Прочти один финансовый совет',
    detail: 'Займёт 1 минуту. На Дашборде и в разделе Финансы есть персональные инсайты',
    route: '/dashboard', action: 'На Главную',
  });

  // Сортируем: сначала high, потом medium, потом low
  const order = { high: 0, medium: 1, low: 2 };
  steps.sort((a, b) => order[a.priority] - order[b.priority]);

  const priorityStep = steps[0];

  // ── Быстрые действия в табе «Совет» ──────────────────────────────────────
  // Кредитный калькулятор показываем только когда финансы стабильны.
  // При критическом/высоком стрессе заменяем на советы по экономии.
  const showCreditCalc = !isHighStress || (hasCredits && !isCritical);

  const quickActions: QuickAction[] = [
    {
      icon: '📊', label: 'Посмотреть расходы',
      route: '/finance', desc: 'Категории и динамика трат',
    },
    showCreditCalc
      ? {
          icon: '🏦',
          label: hasCredits ? 'Рефинансирование' : 'Кредитный калькулятор',
          route: '/analytics',
          desc: hasCredits ? 'Снизить ставку и платёж' : 'Рассчитать условия под тебя',
        }
      : {
          icon: '💡', label: 'Советы по экономии',
          route: '/dashboard', desc: 'Инсайты и рекомендации',
        },
    {
      icon: '🐾', label: 'К КопиКоту',
      route: '/arena', desc: 'Квиз дня и монеты',
    },
  ];

  // ── Приветствие ───────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер';
  const greeting  = `${timeGreet}, ${name}! Давай разберёмся с финансами шаг за шагом.`;

  return { greeting, priorityLabel, priorityStep, steps, observation, urgency, tip, quickActions };
}
