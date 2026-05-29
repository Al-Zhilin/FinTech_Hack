import type { FinancialGoal, QuizAnswers, QuizAnalysis } from '@/shared/types';

// ─── Question config ────────────────────────────────────────────────────────

export type QuizQuestionType = 'single' | 'multi' | 'number';

export interface QuizOption {
  id: string;
  label: string;
  icon?: string;
}

export interface QuizQuestion {
  key: keyof QuizAnswers;
  type: QuizQuestionType;
  title: string;
  subtitle?: string;
  emoji: string;
  options?: QuizOption[];
  placeholder?: string;
  suffix?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'persona',
    type: 'single',
    emoji: '🙋',
    title: 'Кто вы сейчас?',
    subtitle: 'Это поможет подобрать релевантные советы',
    options: [
      { id: 'student', label: 'Студент', icon: '🎓' },
      { id: 'office', label: 'Офисный сотрудник', icon: '💼' },
      { id: 'family_mortgage', label: 'Семья с ипотекой', icon: '🏡' },
      { id: 'freelancer', label: 'Фрилансер', icon: '💻' },
      { id: 'single', label: 'Одинокий без детей', icon: '🧍' },
    ],
  },
  {
    key: 'income',
    type: 'number',
    emoji: '💵',
    title: 'Ваш ежемесячный доход?',
    subtitle: 'Укажите доход после налогов',
    placeholder: '100 000',
    suffix: '₽',
  },
  {
    key: 'obligatoryCategories',
    type: 'multi',
    emoji: '🧾',
    title: 'Куда уходят обязательные платежи?',
    subtitle: 'Выберите все подходящие — чем больше, тем точнее анализ',
    options: [
      { id: 'utilities', label: 'ЖКХ', icon: '🏠' },
      { id: 'car', label: 'Автомобиль', icon: '🚗' },
      { id: 'rent', label: 'Квартплата', icon: '🎫' },
      { id: 'credit_card', label: 'Кредитка', icon: '💳' },
      { id: 'clothes', label: 'Одежда', icon: '👔' },
      { id: 'travel', label: 'Поездки', icon: '🧳' },
      { id: 'food', label: 'Еда', icon: '☕' },
      { id: 'entertainment', label: 'Развлечения', icon: '🎭' },
      { id: 'communication', label: 'Связь', icon: '☎️' },
    ],
  },
  {
    key: 'credits',
    type: 'single',
    emoji: '🏦',
    title: 'Есть ли у вас кредиты / займы?',
    options: [
      { id: 'none', label: 'Нет' },
      { id: 'one_small', label: 'Да, один небольшой' },
      { id: 'one_big', label: 'Да, один крупный' },
      { id: 'two_plus', label: 'Да, два и более' },
      { id: 'overdue', label: 'Да, есть просрочки' },
    ],
  },
  {
    key: 'moneyLeft',
    type: 'single',
    emoji: '📆',
    title: 'Остаются ли деньги до следующей зарплаты?',
    options: [
      { id: 'always', label: 'Да, всегда остаётся', icon: '😊' },
      { id: 'often', label: 'Чаще да, чем нет', icon: '🙂' },
      { id: 'varies', label: 'Бывает по-разному', icon: '😐' },
      { id: 'rarely', label: 'Часто не хватает', icon: '😟' },
      { id: 'never', label: 'Нет, живу в минус / займы', icon: '😭' },
    ],
  },
  {
    key: 'cushion',
    type: 'single',
    emoji: '🛟',
    title: 'Есть ли «подушка безопасности»?',
    options: [
      { id: 'strong', label: 'Да, 3+ месячных дохода' },
      { id: 'some', label: 'Да, немного (1–2 дохода)' },
      { id: 'little', label: 'Почти ничего (меньше дохода)' },
      { id: 'none', label: 'Вообще нет' },
      { id: 'debt', label: 'Долги, а не накопления' },
    ],
  },
  {
    key: 'cardAttitude',
    type: 'single',
    emoji: '💳',
    title: 'Как вы относитесь к кредиткам?',
    options: [
      { id: 'never', label: 'Не беру в принципе' },
      { id: 'conscious', label: 'Беру осознанно и под расчёт' },
      { id: 'gap', label: 'Беру, когда не хватает до зарплаты' },
      { id: 'always', label: 'Живу в кредит постоянно' },
      { id: 'tool', label: 'Использую как инструмент (ипотека, бизнес)' },
    ],
  },
  {
    key: 'priority',
    type: 'single',
    emoji: '🎯',
    title: 'Что для вас сейчас важнее всего финансово?',
    options: [
      { id: 'close_loan', label: 'Закрыть ипотеку / кредит' },
      { id: 'build_savings', label: 'Создать накопления' },
      { id: 'big_purchase', label: 'Накопить на крупную покупку' },
      { id: 'reduce_debt', label: 'Снизить долговую нагрузку' },
      { id: 'understand', label: 'Понять, куда уходят деньги' },
    ],
  },
  {
    key: 'currentGoal',
    type: 'single',
    emoji: '🚀',
    title: 'Какая финансовая цель прямо сейчас?',
    options: [
      { id: 'down_payment', label: 'Первоначальный взнос на жильё', icon: '🏠' },
      { id: 'car', label: 'Машина', icon: '🚗' },
      { id: 'vacation', label: 'Отпуск', icon: '✈️' },
      { id: 'education', label: 'Образование', icon: '🎓' },
      { id: 'no_goal', label: 'Нет конкретной цели', icon: '🤷' },
    ],
  },
];

export const EMPTY_ANSWERS: QuizAnswers = {
  persona: '',
  income: 0,
  obligatoryCategories: [],
  credits: '',
  moneyLeft: '',
  cushion: '',
  cardAttitude: '',
  priority: '',
  currentGoal: '',
};

// ─── Mapping helpers ──────────────────────────────────────────────────────────

const PERSONA_LABELS: Record<string, string> = {
  student: 'Студент',
  office: 'Офисный сотрудник',
  family_mortgage: 'Семья с ипотекой',
  freelancer: 'Фрилансер',
  single: 'Одинокий без детей',
};

const GOAL_MAP: Record<string, FinancialGoal> = {
  down_payment: 'apartment',
  car: 'car',
  vacation: 'vacation',
  education: 'other',
  no_goal: 'other',
};

export const quizGoalToFinancialGoal = (id: string): FinancialGoal =>
  GOAL_MAP[id] ?? 'other';

// ─── Analysis (mock until the funnel/API is ready) ────────────────────────────

export const analyzeQuiz = (a: QuizAnswers): QuizAnalysis => {
  let score = 60;

  // Деньги до зарплаты
  score += { always: 18, often: 10, varies: 0, rarely: -12, never: -22 }[a.moneyLeft] ?? 0;
  // Подушка безопасности
  score += { strong: 20, some: 10, little: -4, none: -12, debt: -20 }[a.cushion] ?? 0;
  // Кредитная нагрузка
  score += { none: 12, one_small: 4, one_big: -6, two_plus: -14, overdue: -24 }[a.credits] ?? 0;
  // Отношение к кредиткам
  score += { never: 6, conscious: 10, gap: -8, always: -16, tool: 4 }[a.cardAttitude] ?? 0;

  score = Math.max(5, Math.min(100, Math.round(score)));

  const riskLevel: QuizAnalysis['riskLevel'] = score >= 70 ? 'low' : score >= 45 ? 'medium' : 'high';

  const tags: string[] = [];
  if (a.credits === 'overdue' || a.credits === 'two_plus') tags.push('Высокая долговая нагрузка');
  if (a.cushion === 'none' || a.cushion === 'debt') tags.push('Нет резерва');
  if (a.moneyLeft === 'always' || a.moneyLeft === 'often') tags.push('Стабильный денежный поток');
  if (a.cardAttitude === 'conscious') tags.push('Дисциплина с кредитками');
  if (tags.length === 0) tags.push('Сбалансированный профиль');

  const recommendations: string[] = [];
  if (a.cushion === 'none' || a.cushion === 'debt' || a.cushion === 'little') {
    recommendations.push('Начните формировать подушку безопасности — цель 3 месячных дохода');
  }
  if (a.credits === 'two_plus' || a.credits === 'overdue') {
    recommendations.push('Сфокусируйтесь на снижении долговой нагрузки и рефинансировании');
  }
  if (a.priority === 'understand' || a.obligatoryCategories.length >= 5) {
    recommendations.push('Подключите данные о тратах, чтобы видеть полную картину расходов');
  }
  if (recommendations.length === 0) {
    recommendations.push('Поставьте конкретную цель и автоматизируйте регулярные отчисления');
  }

  const summary =
    riskLevel === 'low'
      ? 'Ваши финансы под контролем. Сфокусируемся на росте накоплений и достижении цели.'
      : riskLevel === 'medium'
      ? 'Есть запас прочности, но стоит укрепить резерв и оптимизировать расходы.'
      : 'Финансы под давлением. Начнём с подушки безопасности и снижения долгов.';

  return {
    healthScore: score,
    riskLevel,
    personaLabel: PERSONA_LABELS[a.persona] ?? 'Пользователь',
    summary,
    tags,
    recommendations,
  };
};
