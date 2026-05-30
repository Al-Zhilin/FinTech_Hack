import type { Goal } from '@/shared/types';

export interface GoalFinance {
  income: number;
  expenses: number;
}

export type GoalStatus = 'done' | 'on_track' | 'tight' | 'hard';

export interface GoalAnalysis {
  pct: number;             // прогресс, %
  remaining: number;       // сколько осталось накопить, ₽
  monthsLeft: number;      // месяцев до дедлайна
  freeCash: number;        // свободные деньги в месяц, ₽
  requiredMonthly: number; // нужно откладывать в месяц, чтобы успеть, ₽
  recommendedMonthly: number;
  sharePct: number;        // какая доля свободных денег уйдёт на цель, %
  etaMonths: number | null;// прогноз по сроку при текущем темпе
  etaDate: string | null;  // дата достижения при текущем темпе
  status: GoalStatus;
  headline: string;        // короткий вывод
  plan: string[];          // план достижения
}

const MS_DAY = 86_400_000;

const monthsBetween = (from: Date, to: Date): number => {
  const days = (to.getTime() - from.getTime()) / MS_DAY;
  return Math.max(1, Math.round(days / 30.4));
};

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const fmtDate = (d: Date): string =>
  d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

export const analyzeGoal = (goal: Goal, finance: GoalFinance): GoalAnalysis => {
  const now = new Date();
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const remaining = Math.max(0, goal.target - goal.current);
  const monthsLeft = monthsBetween(now, new Date(goal.deadline));
  const freeCash = Math.max(0, finance.income - finance.expenses);

  const requiredMonthly = Math.ceil(remaining / monthsLeft);
  const recommendedMonthly = Math.min(requiredMonthly, freeCash || requiredMonthly);
  const sharePct = freeCash > 0 ? Math.round((requiredMonthly / freeCash) * 100) : 999;
  const etaMonths = freeCash > 0 ? Math.ceil(remaining / freeCash) : null;
  const etaDate = etaMonths !== null ? fmtDate(addMonths(now, etaMonths)) : null;

  let status: GoalStatus;
  if (remaining <= 0) status = 'done';
  else if (requiredMonthly <= freeCash * 0.6) status = 'on_track';
  else if (requiredMonthly <= freeCash) status = 'tight';
  else status = 'hard';

  const headline = (() => {
    if (status === 'done') return 'Цель достигнута! 🎉';
    if (status === 'on_track')
      return `Ты на верном пути — хватит ${sharePct}% свободных денег в месяц.`;
    if (status === 'tight')
      return `Цель реальна, но потребует ${sharePct}% свободных денег ежемесячно.`;
    return 'При текущих расходах к сроку не успеть — нужен план.';
  })();

  const plan: string[] = [];
  if (status !== 'done') {
    if (status === 'hard') {
      if (freeCash <= 0 || finance.income <= 0) {
        plan.push(
          `Накопить ${remaining.toLocaleString('ru-RU')} ₽ за ${monthsLeft} мес. — очень амбициозно при нулевом балансе.`,
        );
        plan.push('Давай перенесём срок или разобьём сумму на более долгий период?');
        plan.push('Сначала укажите доход и текущий остаток — без этого план будет нереалистичным.');
      } else {
        const gap = requiredMonthly - freeCash;
        plan.push(
          `При свободных ${freeCash.toLocaleString('ru-RU')} ₽/мес не хватает ${Math.max(0, gap).toLocaleString('ru-RU')} ₽ для срока.`,
        );
        plan.push('Сократите 1–2 крупные категории трат или перенесите дедлайн.');
        if (etaDate) plan.push(`При текущем темпе цель ближе к ${etaDate}.`);
      }
    } else {
      const monthly = Math.min(requiredMonthly, freeCash || requiredMonthly);
      plan.push(
        `Откладывай ~${monthly.toLocaleString('ru-RU')} ₽ в месяц — это ${sharePct}% свободных денег.`,
      );
      plan.push('Настрой автоперевод в день зарплаты — деньги уйдут на цель до трат.');
    }
  }

  return {
    pct, remaining, monthsLeft, freeCash,
    requiredMonthly, recommendedMonthly, sharePct,
    etaMonths, etaDate, status, headline, plan,
  };
};

// ─── Опыт других людей с похожими целями ─────────────────────────────────────

export interface PeerStory {
  name: string;
  age: number;
  color: string;
  goal: string;
  text: string;
}

type PeerCategory = 'vacation' | 'apartment' | 'car' | 'cushion' | 'tech' | 'business' | 'generic';

const detectCategory = (title: string): PeerCategory => {
  const t = title.toLowerCase();
  if (/отпуск|путешеств|поездк|тур|море|пляж/.test(t)) return 'vacation';
  if (/квартир|ипотек|жил|дом|взнос/.test(t)) return 'apartment';
  if (/авто|машин|тачк|car/.test(t)) return 'car';
  if (/подушк|резерв|safety|запас|чёрный день|черный день/.test(t)) return 'cushion';
  if (/ноут|телефон|техник|комп|laptop|iphone|пк/.test(t)) return 'tech';
  if (/бизнес|дело|стартап|business/.test(t)) return 'business';
  return 'generic';
};

const PEER_STORIES: Record<PeerCategory, PeerStory[]> = {
  vacation: [
    { name: 'Алина', age: 27, color: '#E8856A', goal: 'Отпуск в Италии',
      text: 'Откладывала 12% зарплаты на отдельный счёт. Отказалась от такси в пользу метро — за 7 месяцев собрала на двоих.' },
    { name: 'Игорь', age: 31, color: '#4ECDC4', goal: 'Тур в Таиланд',
      text: 'Продал ненужную технику и завёл правило «кэшбэк только на отпуск». Накопил за полгода без стресса.' },
  ],
  apartment: [
    { name: 'Мария', age: 29, color: '#B87EFF', goal: 'Первый взнос',
      text: 'Жёстко урезала доставку еды и подписки. Перевела всё в накопительный счёт под 16% — взнос собрала за 2 года.' },
    { name: 'Дмитрий', age: 34, color: '#34C759', goal: 'Взнос по ипотеке',
      text: 'Брал подработки по выходным и автоматизировал 25% дохода на цель. Помогло не «проедать» бонусы.' },
  ],
  car: [
    { name: 'Сергей', age: 26, color: '#FF6B6B', goal: 'Авто без кредита',
      text: 'Считал каждую трату в приложении. Понял, что 8 000 ₽/мес уходит на мелочи — перенаправил их на машину.' },
    { name: 'Камила', age: 30, color: '#FFB02E', goal: 'Подержанный автомобиль',
      text: 'Откладывала премию целиком. За 10 месяцев собрала на надёжную б/у машину и обошлась без переплат банку.' },
  ],
  cushion: [
    { name: 'Олег', age: 33, color: '#4ECDC4', goal: 'Подушка на 6 месяцев',
      text: 'Начал с правила «сначала заплати себе» — 10% сразу после зарплаты. Через год была подушка на полгода жизни.' },
    { name: 'Настя', age: 25, color: '#E8856A', goal: 'Финансовый резерв',
      text: 'Откладывала по чуть-чуть, но регулярно. Округление покупок дало ещё +3 000 ₽ в месяц незаметно.' },
  ],
  tech: [
    { name: 'Павел', age: 23, color: '#B87EFF', goal: 'Новый ноутбук',
      text: 'Поставил цель в приложении и отказался от 2 подписок. Собрал за 3 месяца, купил без рассрочки.' },
    { name: 'Лена', age: 28, color: '#34C759', goal: 'Техника для работы',
      text: 'Копила кэшбэк и бонусы на отдельной карте. Хватило на технику и аксессуары без удара по бюджету.' },
  ],
  business: [
    { name: 'Артём', age: 35, color: '#FF6B6B', goal: 'Запуск своего дела',
      text: 'Откладывал 20% дохода в «фонд бизнеса» полгода. Стартовал без займов и спал спокойно.' },
    { name: 'Вика', age: 32, color: '#FFB02E', goal: 'Первые вложения в дело',
      text: 'Разделила личные и будущие бизнес-деньги. Дисциплина переводов помогла собрать стартовый капитал.' },
  ],
  generic: [
    { name: 'Кирилл', age: 28, color: '#E8856A', goal: 'Личная цель',
      text: 'Главное — автоматизировать перевод на цель сразу после зарплаты. Тогда копится само собой.' },
    { name: 'Юля', age: 26, color: '#B87EFF', goal: 'Своя мечта',
      text: 'Разбила большую цель на маленькие месячные шаги. Видеть прогресс — лучшая мотивация не сдаваться.' },
  ],
};

export const getPeerStories = (goal: Goal): PeerStory[] =>
  PEER_STORIES[detectCategory(goal.title)];

export const getDaysUntilDeadline = (deadline: string): number =>
  Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_DAY));

export function getGoalPlanText(ga: GoalAnalysis, goal: Goal, finance: GoalFinance): string {
  if (ga.status === 'done') return 'Цель достигнута! 🎉';
  if (ga.status === 'hard') {
    if (ga.freeCash <= 0 || finance.income <= 0) {
      return `Кажется, накопить ${goal.target.toLocaleString('ru-RU')} ₽ за ${ga.monthsLeft} мес. будет сложно. Давай перенесём срок или разобьём сумму?`;
    }
    return ga.headline;
  }
  const monthly = Math.min(ga.requiredMonthly, ga.freeCash || ga.requiredMonthly);
  return `Откладывай ~${monthly.toLocaleString('ru-RU')} ₽ в месяц — ${ga.sharePct}% свободных денег.`;
}
