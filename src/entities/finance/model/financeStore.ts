import { create } from 'zustand';
import type { FinancialProfile } from '@/shared/types';
import { MOCK_FINANCE } from './mockData';

interface FinanceState {
  profile: FinancialProfile;
  isLoading: boolean;
  // When API is ready, replace this with a real fetch
  fetchProfile: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  profile: MOCK_FINANCE,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    // TODO: replace with real API call
    await new Promise(r => setTimeout(r, 800));
    set({ profile: MOCK_FINANCE, isLoading: false });
  },
}));
