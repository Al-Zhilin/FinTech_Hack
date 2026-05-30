import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlanStep {
  id: string;
  text: string;
  detail?: string;
  route?: string;         // путь для перехода
  action?: string;        // label кнопки
  icon: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'savings' | 'spending' | 'goals' | 'arena' | 'learning';
}

interface CoachState {
  doneSteps: string[];     // id выполненных шагов
  dismissed: string[];     // id закрытых подсказок
  weekStart: string | null;// ISO дата начала текущего плана
  seenIntro: boolean;      // видел ли пользователь приветствие

  markDone:    (id: string) => void;
  markUndone:  (id: string) => void;
  dismiss:     (id: string) => void;
  seeIntro:    () => void;
  resetWeek:   () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      doneSteps: [],
      dismissed: [],
      weekStart: null,
      seenIntro: false,

      markDone: (id) => set(s => ({
        doneSteps: s.doneSteps.includes(id) ? s.doneSteps : [...s.doneSteps, id],
      })),
      markUndone: (id) => set(s => ({
        doneSteps: s.doneSteps.filter(d => d !== id),
      })),
      dismiss: (id) => set(s => ({
        dismissed: s.dismissed.includes(id) ? s.dismissed : [...s.dismissed, id],
      })),
      seeIntro: () => set({ seenIntro: true, weekStart: todayStr() }),
      resetWeek: () => set({ doneSteps: [], weekStart: todayStr() }),
    }),
    { name: 'ekvator-coach' },
  ),
);
