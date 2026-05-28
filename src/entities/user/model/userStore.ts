import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isOnboardingDone: boolean;
  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  completeOnboarding: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isOnboardingDone: false,

      setUser: (user) => set({ user }),

      updateUser: (patch) =>
        set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),

      completeOnboarding: (user) =>
        set({ user, isAuthenticated: true, isOnboardingDone: true }),

      logout: () =>
        set({ user: null, isAuthenticated: false, isOnboardingDone: false }),
    }),
    {
      name: 'ekvator_user_store',
    }
  )
);
