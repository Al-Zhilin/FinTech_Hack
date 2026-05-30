import { create } from 'zustand';
import type { User, FinancialProfile, Transaction, Goal } from '@/shared/types';
import { buildProfileFromUser } from './buildProfileFromUser';
import type { FinanceAnalysis } from './financeAnalysis';
import { useUserTxStore } from './userTxStore';

interface FinanceState {
  profile: FinancialProfile;
  analysis: FinanceAnalysis;
  isLoading: boolean;
  syncFromUser: (user: User | null, txs?: Transaction[], goals?: Goal[]) => void;
  fetchProfile: () => Promise<void>;
}

const initial = buildProfileFromUser(null);

export const useFinanceStore = create<FinanceState>((set) => ({
  profile: initial.profile,
  analysis: initial.analysis,
  isLoading: false,

  syncFromUser: (user, txs = [], goals = []) => {
    const { bankConnected } = useUserTxStore.getState();
    const { profile, analysis } = buildProfileFromUser(user, txs, goals, bankConnected);
    set({ profile, analysis });
  },

  fetchProfile: async () => {
    set({ isLoading: true });
    const { useUserStore } = await import('@/entities/user/model/userStore');
    const { useUserGoalsStore } = await import('@/entities/goal/model/userGoalsStore');
    const user = useUserStore.getState().user;
    const { txs, bankConnected } = useUserTxStore.getState();
    const goals = useUserGoalsStore.getState().goals;
    const { profile, analysis } = buildProfileFromUser(user, txs, goals, bankConnected);
    set({ profile, analysis, isLoading: false });
  },
}));

export const useFinanceAnalysis = () => useFinanceStore(s => s.analysis);
