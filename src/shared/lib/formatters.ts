import type { CurrencyCode, Lang } from '@/shared/config/settingsStore';

// ─── Currency config ─────────────────────────────────────────────────────────
// Все суммы в приложении хранятся в рублях (база). При смене валюты конвертируем
// на лету — поэтому пересчитывается всё приложение без правок в местах вызова.

interface CurrencyMeta {
  symbol: string;
  locale: string;
  rate: number; // 1 ₽ = rate единиц валюты
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  RUB: { symbol: '₽', locale: 'ru-RU', rate: 1 },
  USD: { symbol: '$', locale: 'en-US', rate: 1 / 90 },
  EUR: { symbol: '€', locale: 'de-DE', rate: 1 / 100 },
};

let activeCurrency: CurrencyCode = 'RUB';
let activeLang: Lang = 'ru';

export const setMoneyConfig = (lang: Lang, currency: CurrencyCode) => {
  activeLang = lang;
  activeCurrency = currency;
};

export const convertFromRub = (rub: number): number => rub * CURRENCIES[activeCurrency].rate;

export const formatCurrency = (amountRub: number, compact = false): string => {
  const meta = CURRENCIES[activeCurrency];
  const v = amountRub * meta.rate;

  if (compact && Math.abs(v) >= 1000) {
    const suffix = activeLang === 'en' ? 'k' : 'к';
    return `${Math.round(v / 1000)}${suffix} ${meta.symbol}`;
  }

  const fractionDigits = activeCurrency === 'RUB' ? 0 : Math.abs(v) < 1000 ? 2 : 0;
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: activeCurrency,
    maximumFractionDigits: fractionDigits,
  }).format(v);
};

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' });
};

export const getGreeting = (): string => {
  const h = new Date().getHours();
  if (activeLang === 'en') {
    if (h < 6) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
};
