import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'ru' | 'en';
export type CurrencyCode = 'RUB' | 'USD' | 'EUR';

export const CURRENCIES_LIST: { code: CurrencyCode; label: string }[] = [
  { code: 'RUB', label: 'Российский рубль' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
];

interface SettingsState {
  lang: Lang;
  currency: CurrencyCode;
  setLang: (l: Lang) => void;
  setCurrency: (c: CurrencyCode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'ru',
      currency: 'RUB',
      setLang: (lang) => set({ lang }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'ekvator_settings' },
  ),
);
