import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { REWARDS, findShopItem, type ShopItem } from './copyCat';

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Считает текущую серию по отсортированному массиву дат (ISO, уникальных). */
function calcStreak(history: string[], today: string): number {
  if (history.length === 0) return 0;
  const sorted = [...new Set(history)].sort().reverse(); // desc
  // Серия считается с сегодня или со вчера (если сегодня ещё не зашли)
  let cursor = today;
  let streak = 0;
  for (const date of sorted) {
    if (date === cursor) {
      streak++;
      // Отматываем cursor на сутки назад
      const d = new Date(cursor + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else if (date < cursor) {
      // Пропуск → серия оборвалась
      break;
    }
    // date > cursor: будущее — игнорируем
  }
  return streak;
}

/** Считает максимальную серию за всё время. */
function calcLongestStreak(history: string[]): number {
  if (history.length === 0) return 0;
  const sorted = [...new Set(history)].sort(); // asc
  let best = 1;
  let cur  = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = daysBetween(sorted[i - 1], sorted[i]);
    if (diff === 1) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

export type BuyResult = { ok: true; item: ShopItem } | { ok: false; reason: 'owned' | 'no_coins' | 'not_found' };

interface ArenaState {
  coins: number;
  owned: string[];
  equipped: string[];
  dailyQuizDate: string | null;
  starterPackDate: string | null;
  lastVisit: string | null;
  weeklyScore: number;
  rank: number;
  daysAway: number;
  /** История дней, когда пользователь заходил в Арену (ISO YYYY-MM-DD, дедуп) */
  visitHistory: string[];
  /** Текущая серия подряд идущих дней */
  streak: number;
  /** Рекордная серия за всё время */
  longestStreak: number;

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
      visitHistory: [],
      streak: 0,
      longestStreak: 0,

      checkIn: () => {
        const { lastVisit, coins, visitHistory } = get();
        const today = todayStr();
        if (lastVisit === today) return; // уже засчитано сегодня

        const away = lastVisit ? daysBetween(lastVisit, today) : 0;

        // Добавляем сегодня в историю (уникально)
        const newHistory = visitHistory.includes(today)
          ? visitHistory
          : [...visitHistory, today];

        const streak        = calcStreak(newHistory, today);
        const longestStreak = Math.max(calcLongestStreak(newHistory), get().longestStreak);

        set({
          coins: coins + REWARDS.dailyLogin,
          daysAway: away,
          lastVisit: today,
          visitHistory: newHistory,
          streak,
          longestStreak,
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

export const isDailyQuizDone  = (s: ArenaState) => s.dailyQuizDate === todayStr();
export const isStarterClaimed = (s: ArenaState) => s.starterPackDate === todayStr();

/** Возвращает последние N дней (ISO) в хронологическом порядке, заканчивая сегодня. */
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
