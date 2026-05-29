import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '@/shared/lib/genId';
import type { Transaction } from '@/shared/types';

export type NewTxInput = Omit<Transaction, 'id' | 'date'> & { date?: string };

interface UserTxState {
  txs: Transaction[];
  addTx: (input: NewTxInput) => void;
  removeTx: (id: string) => void;
}

export const useUserTxStore = create<UserTxState>()(
  persist(
    (set) => ({
      txs: [],
      addTx: (input) =>
        set(state => ({
          txs: [
            { ...input, id: genId(), date: input.date ?? new Date().toISOString() },
            ...state.txs,
          ],
        })),
      removeTx: (id) => set(state => ({ txs: state.txs.filter(t => t.id !== id) })),
    }),
    { name: 'ekvator_user_tx' },
  ),
);
