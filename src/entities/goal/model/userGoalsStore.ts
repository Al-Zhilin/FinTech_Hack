import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '@/shared/lib/genId';
import type { Goal } from '@/shared/types';

export type NewGoalInput = Omit<Goal, 'id' | 'current'> & { current?: number };

interface UserGoalsState {
  goals: Goal[];
  addGoal: (input: NewGoalInput) => void;
  topUp: (id: string, amount: number) => void;
  removeGoal: (id: string) => void;
}

export const useUserGoalsStore = create<UserGoalsState>()(
  persist(
    (set) => ({
      goals: [],

      addGoal: (input) =>
        set(state => ({
          goals: [
            { ...input, id: genId(), current: input.current ?? 0 },
            ...state.goals,
          ],
        })),

      topUp: (id, amount) =>
        set(state => ({
          goals: state.goals.map(g =>
            g.id === id ? { ...g, current: Math.min(g.target, g.current + amount) } : g,
          ),
        })),

      removeGoal: (id) =>
        set(state => ({ goals: state.goals.filter(g => g.id !== id) })),
    }),
    { name: 'ekvator_user_goals' },
  ),
);
