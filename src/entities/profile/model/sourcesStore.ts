import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SourceId = 'csv' | 'telegram' | 'qr';

interface SourcesState {
  connected: Record<SourceId, boolean>;
  lastCsvRows?: number;
  connect: (id: SourceId) => void;
  disconnect: (id: SourceId) => void;
  setCsvRows: (n: number) => void;
}

export const useSourcesStore = create<SourcesState>()(
  persist(
    (set) => ({
      connected: { csv: false, telegram: false, qr: false },
      connect: (id) => set(s => ({ connected: { ...s.connected, [id]: true } })),
      disconnect: (id) => set(s => ({ connected: { ...s.connected, [id]: false } })),
      setCsvRows: (n) => set({ lastCsvRows: n }),
    }),
    { name: 'ekvator_sources' },
  ),
);
