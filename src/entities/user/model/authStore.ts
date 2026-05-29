import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types';

// Mock obfuscation only — this is a client-side demo, not real security.
const obfuscate = (s: string): string => btoa(unescape(encodeURIComponent(s)));

export interface Account {
  email: string;
  name: string;
  password: string;        // obfuscated
  user?: User;             // saved profile once onboarding is finished
  onboardingDone: boolean;
}

interface AuthResult {
  ok: boolean;
  error?: string;
  account?: Account;
}

interface AuthState {
  accounts: Record<string, Account>;
  register: (email: string, name: string, password: string) => AuthResult;
  login: (email: string, password: string) => AuthResult;
  saveProfile: (email: string, user: User) => void;
}

const normalize = (email: string) => email.trim().toLowerCase();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: {},

      register: (email, name, password) => {
        const key = normalize(email);
        if (!key || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) {
          return { ok: false, error: 'Введите корректный email' };
        }
        if (name.trim().length < 2) return { ok: false, error: 'Введите имя' };
        if (password.length < 6) return { ok: false, error: 'Пароль минимум 6 символов' };
        if (get().accounts[key]) return { ok: false, error: 'Аккаунт уже существует' };

        const account: Account = {
          email: key,
          name: name.trim(),
          password: obfuscate(password),
          onboardingDone: false,
        };
        set(state => ({ accounts: { ...state.accounts, [key]: account } }));
        return { ok: true, account };
      },

      login: (email, password) => {
        const key = normalize(email);
        const account = get().accounts[key];
        if (!account) return { ok: false, error: 'Аккаунт не найден' };
        if (account.password !== obfuscate(password)) {
          return { ok: false, error: 'Неверный пароль' };
        }
        return { ok: true, account };
      },

      saveProfile: (email, user) => {
        const key = normalize(email);
        set(state => {
          const acc = state.accounts[key];
          if (!acc) return state;
          return {
            accounts: {
              ...state.accounts,
              [key]: { ...acc, user, onboardingDone: true },
            },
          };
        });
      },
    }),
    { name: 'ekvator_auth_store' }
  )
);
