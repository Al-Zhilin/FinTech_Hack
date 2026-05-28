import type { FinancialGoal } from '@/shared/types';

export interface GoalOption {
  value: FinancialGoal;
  label: string;
  icon: string;
  desc: string;
}

export const GOAL_OPTIONS: GoalOption[] = [
  { value: 'emergency_fund', label: 'Подушка безопасности', icon: '🛡️', desc: '3–6 месячных расходов' },
  { value: 'vacation',       label: 'Отпуск мечты',         icon: '✈️', desc: 'Путешествие без долгов' },
  { value: 'apartment',      label: 'Квартира',              icon: '🏠', desc: 'Накопить на первый взнос' },
  { value: 'car',            label: 'Автомобиль',            icon: '🚗', desc: 'Своё авто без кредита' },
  { value: 'business',       label: 'Бизнес',                icon: '🚀', desc: 'Запустить своё дело' },
  { value: 'retirement',     label: 'Пенсия',                icon: '🌴', desc: 'Финансовая независимость' },
  { value: 'other',          label: 'Другое',                icon: '🎯', desc: 'Своя финансовая цель' },
];

export const getGoalLabel = (value: FinancialGoal): string =>
  GOAL_OPTIONS.find(g => g.value === value)?.label ?? 'Цель';
