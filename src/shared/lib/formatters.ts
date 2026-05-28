export const formatCurrency = (amount: number, compact = false): string => {
  if (compact && amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}к ₽`;
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercent = (value: number): string =>
  `${Math.round(value)}%`;

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
};
