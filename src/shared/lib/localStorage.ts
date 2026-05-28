import type { User } from '../types';

const KEYS = {
  USER: 'ekvator_user',
  IS_AUTHENTICATED: 'ekvator_auth',
  ONBOARDING_DONE: 'ekvator_onboarding',
} as const;

export const storage = {
  getUser: (): User | null => {
    try {
      const raw = localStorage.getItem(KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: User) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  isAuthenticated: (): boolean => {
    return localStorage.getItem(KEYS.IS_AUTHENTICATED) === 'true';
  },
  setAuthenticated: (value: boolean) => {
    localStorage.setItem(KEYS.IS_AUTHENTICATED, String(value));
  },
  isOnboardingDone: (): boolean => {
    return localStorage.getItem(KEYS.ONBOARDING_DONE) === 'true';
  },
  setOnboardingDone: (value: boolean) => {
    localStorage.setItem(KEYS.ONBOARDING_DONE, String(value));
  },
  clear: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
