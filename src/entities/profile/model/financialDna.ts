import type { User, FinancialProfile } from '@/shared/types';

export interface FinancialDna {
  emoji: string;
  type: string;       // напр. «Стратег-Накопитель»
  blurb: string;
}

export interface FinancialLevel {
  level: number;      // 1–5
  title: string;
  progress: number;   // 0–100 до следующего уровня
  health: number;     // индекс здоровья 0–100
}

const LEVEL_TITLES = ['Новичок', 'Ученик', 'Уверенный', 'Стратег', 'Мастер'];

export const getFinancialLevel = (
  user: User | null,
  profile: FinancialProfile,
  txCount = 0,
): FinancialLevel => {
  const health = Math.max(0, 100 - profile.stressScore);

  if (txCount === 0 && profile.stressScore >= 100) {
    return {
      level: 1,
      title: 'Новичок',
      progress: 0,
      health: 0,
    };
  }
  const level = Math.max(1, Math.min(5, Math.floor(health / 20) + 1));
  const within = health % 20;
  return {
    level,
    title: LEVEL_TITLES[level - 1],
    progress: Math.round((within / 20) * 100),
    health,
  };
};

export const getFinancialDna = (user: User | null, profile: FinancialProfile): FinancialDna => {
  const savings = profile.savingsRate;
  const hasCredits = user?.hasCredits ?? false;
  const cushion = user?.quiz?.cushion;
  const cardAttitude = user?.quiz?.cardAttitude;

  if (savings >= 25 && !hasCredits) {
    return { emoji: '🧬', type: 'Стратег-Накопитель', blurb: 'Откладываете системно и держите долги под контролем.' };
  }
  if (savings >= 15) {
    return { emoji: '🛡️', type: 'Осторожный Хранитель', blurb: 'Бережёте подушку и избегаете лишних рисков.' };
  }
  if (hasCredits && cardAttitude === 'love') {
    return { emoji: '🎢', type: 'Кредитный Сёрфер', blurb: 'Активно пользуетесь заёмными деньгами — следите за нагрузкой.' };
  }
  if (cushion === 'none' || savings < 5) {
    return { emoji: '🌊', type: 'Свободный Поток', blurb: 'Живёте сегодняшним днём. Маленький шаг к накоплениям всё изменит.' };
  }
  return { emoji: '⚖️', type: 'Балансир', blurb: 'Держите равновесие между тратами и накоплениями.' };
};
