import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { REWARDS, findShopItem, type ShopItem } from './copyCat';

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type BuyResult = { ok: true; item: ShopItem } | { ok: false; reason: 'owned' | 'no_coins' | 'not_found' };

interface ArenaState {
  coins: number;
  owned: string[];        // купленные товары
  equipped: string[];     // надетые аксессуары кота
  dailyQuizDate: string | null;
  starterPackDate: string | null;
  lastVisit: string | null;
  weeklyScore: number;
  rank: number;
  daysAway: number;       // вычисляется при заходе (эффект Тамагочи)

  checkIn: () => void;
  addCoins: (amount: number, bumpScore?: boolean) => void;
  buyItem: (id: string) => BuyResult;
  toggleEquip: (id: string) => void;
  markDailyQuizDone: () => void;
  claimStarterPack: () => boolean;
}

export const useArenaStore = create<ArenaState>()(
  persist(
    (set, get) => ({
      coins: 120,
      owned: [],
      equipped: [],
      dailyQuizDate: null,
      starterPackDate: null,
      lastVisit: null,
      weeklyScore: 320,
      rank: 7,
      daysAway: 0,

      // Вызывается при открытии Арены: бонус за вход и расчёт дней отсутствия.
      checkIn: () => {
        const { lastVisit, coins } = get();
        const today = todayStr();
        if (lastVisit === today) return;
        const away = lastVisit ? daysBetween(lastVisit, today) : 0;
        set({
          coins: coins + REWARDS.dailyLogin,
          daysAway: away,
          lastVisit: today,
        });
      },

      addCoins: (amount, bumpScore = true) =>
        set((s) => ({
          coins: Math.max(0, s.coins + amount),
          weeklyScore: bumpScore && amount > 0 ? s.weeklyScore + amount : s.weeklyScore,
          rank: bumpScore && amount >= 50 ? Math.max(1, s.rank - 1) : s.rank,
        })),

      buyItem: (id) => {
        const item = findShopItem(id);
        if (!item) return { ok: false, reason: 'not_found' };
        const s = get();
        if (s.owned.includes(id)) return { ok: false, reason: 'owned' };
        if (s.coins < item.price) return { ok: false, reason: 'no_coins' };
        set({
          coins: s.coins - item.price,
          owned: [...s.owned, id],
          // аксессуар кота сразу надеваем (один слот — один предмет)
          equipped: item.slot
            ? [...s.equipped.filter((eid) => findShopItem(eid)?.slot !== item.slot), id]
            : s.equipped,
        });
        return { ok: true, item };
      },

      toggleEquip: (id) => {
        const item = findShopItem(id);
        if (!item || !item.slot) return;
        set((s) => {
          if (s.equipped.includes(id)) {
            return { equipped: s.equipped.filter((e) => e !== id) };
          }
          const cleaned = s.equipped.filter((eid) => findShopItem(eid)?.slot !== item.slot);
          return { equipped: [...cleaned, id] };
        });
      },

      markDailyQuizDone: () => set({ dailyQuizDate: todayStr() }),

      claimStarterPack: () => {
        const s = get();
        if (s.starterPackDate === todayStr()) return false;
        set({
          coins: s.coins + REWARDS.starterPack,
          weeklyScore: s.weeklyScore + REWARDS.starterPack,
          starterPackDate: todayStr(),
        });
        return true;
      },
    }),
    { name: 'ekvator-arena' },
  ),
);

// Удобные селекторы-хелперы (используются в UI).
export const isDailyQuizDone = (s: ArenaState) => s.dailyQuizDate === todayStr();
export const isStarterClaimed = (s: ArenaState) => s.starterPackDate === todayStr();
