import { create } from 'zustand';

/**
 * Отложенный промт — способ «прокинуть» вопрос из любого экрана (например,
 * кнопки в инсайтах) в чат с AI. display показывается в пузыре пользователя,
 * payload (с финансовыми данными) реально уходит на бэкенд.
 */
export interface PendingPrompt {
  display: string;
  payload: string;
}

interface ChatState {
  pending: PendingPrompt | null;
  setPending: (p: PendingPrompt) => void;
  consume: () => PendingPrompt | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  consume: () => {
    const { pending } = get();
    if (pending) set({ pending: null });
    return pending;
  },
}));
