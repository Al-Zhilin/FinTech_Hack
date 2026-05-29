import type { TxType } from '@/shared/types';

export interface CategoryMeta {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { id: 'food',          label: 'Еда',          icon: '🍔', color: '#FF6B6B' },
  { id: 'housing',       label: 'Жильё',        icon: '🏠', color: '#B87EFF' },
  { id: 'transport',     label: 'Транспорт',    icon: '🚗', color: '#4ECDC4' },
  { id: 'shopping',      label: 'Покупки',      icon: '🛍️', color: '#FFB02E' },
  { id: 'entertainment', label: 'Развлечения',  icon: '🎬', color: '#F8A5C2' },
  { id: 'health',        label: 'Здоровье',     icon: '💊', color: '#34C759' },
  { id: 'subscriptions', label: 'Подписки',     icon: '📱', color: '#F38181' },
  { id: 'education',     label: 'Образование',  icon: '🎓', color: '#5AA9E6' },
  { id: 'other',         label: 'Другое',       icon: '🔖', color: '#9E9E9E' },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { id: 'salary',    label: 'Зарплата',  icon: '💰', color: '#34C759' },
  { id: 'freelance', label: 'Подработка', icon: '💻', color: '#6C63FF' },
  { id: 'cashback',  label: 'Кэшбэк',    icon: '🎁', color: '#FFB02E' },
  { id: 'other_inc', label: 'Прочее',    icon: '➕', color: '#4ECDC4' },
];

const MAP: Record<string, CategoryMeta> = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach(c => { MAP[c.id] = c; });

export const getCategoryMeta = (id: string): CategoryMeta =>
  MAP[id] ?? { id, label: id, icon: '🔖', color: '#9E9E9E' };

export const categoriesFor = (type: TxType): CategoryMeta[] =>
  type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
