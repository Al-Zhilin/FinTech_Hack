import { create } from 'zustand';
import type { FinancialProfile, User } from '@/shared/types';
import { buildProfileFromUser } from './buildProfileFromUser';

interface FinanceState {
  profile: FinancialProfile;
  isLoading: boolean;
  syncFromUser: (user: User | null) => void;
  fetchProfile: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  profile: buildProfileFromUser(null),
  isLoading: false,

  syncFromUser: (user) => {
    set({ profile: buildProfileFromUser(user) });
  },

  fetchProfile: async () => {
    set({ isLoading: true });
    const { useUserStore } = await import('@/entities/user/model/userStore');
    const user = useUserStore.getState().user;
    set({ profile: buildProfileFromUser(user), isLoading: false });
  },
}));
