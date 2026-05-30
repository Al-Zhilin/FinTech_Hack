import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '@/shared/lib/genId';
import { generateTransactions } from './transactions';
import type { Transaction } from '@/shared/types';

export type NewTxInput = Omit<Transaction, 'id' | 'date'> & { date?: string };

interface UserTxState {
  txs: Transaction[];
  bankConnected: boolean;
  connectedBankId: string | null;
  connectedBankName: string | null;
  addTx: (input: NewTxInput) => void;
  removeTx: (id: string) => void;
  connectBank: (bankId: string, bankName: string) => number;
}

export const useUserTxStore = create<UserTxState>()(
  persist(
    (set) => ({
      txs: [],
      bankConnected: false,
      connectedBankId: null,
      connectedBankName: null,

      addTx: (input) =>
        set(state => ({
          txs: [
            { ...input, id: genId(), date: input.date ?? new Date().toISOString() },
            ...state.txs,
          ],
        })),

      removeTx: (id) =>
        set(state => ({ txs: state.txs.filter(t => t.id !== id) })),

      connectBank: (bankId, bankName) => {
        const mockTxs = generateTransactions(90);
        set({
          txs: mockTxs,
          bankConnected: true,
          connectedBankId: bankId,
          connectedBankName: bankName,
        });
        return mockTxs.length;
      },
    }),
    { name: 'ekvator_user_tx' },
  ),
);
