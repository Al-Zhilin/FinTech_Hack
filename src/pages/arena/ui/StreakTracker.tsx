import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Star } from 'lucide-react';
import { useArenaStore, getLastNDays } from '@/entities/arena/model/arenaStore';

const DAYS_SHOWN = 21; // три недели

const RU_WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const RU_MONTHS   = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

function streakLabel(n: number): string {
  if (n === 0) return 'Начни серию!';
  if (n === 1) return '1 день — начало!';
  const last = n % 10;
  const pre  = n % 100;
  if (pre >= 11 && pre <= 19) return `${n} дней подряд`;
  if (last === 1) return `${n} день подряд`;
  if (last >= 2 && last <= 4) return `${n} дня подряд`;
  return `${n} дней подряд`;
}

function streakEmoji(n: number): string {
  if (n === 0) return '😴';
  if (n < 3)  return '🌱';
  if (n < 7)  return '🔥';
  if (n < 14) return '⚡';
  if (n < 30) return '🚀';
  return '🏆';
}

function streakMotivation(n: number): string {
  if (n === 0) return 'КопиКот ждёт тебя каждый день';
  if (n === 1) return 'Отличное начало! Завтра — день 2';
  if (n < 3)  return 'Продолжай — серия растёт!';
  if (n < 7)  return 'КопиКот доволен твоей активностью!';
  if (n < 14) return 'Неделя без пропусков — КопиКот в восторге!';
  if (n < 30) return 'Ты настоящий финансовый чемпион 🏆';
  return 'Легендарная серия! КопиКот гордится тобой!';
}

// ─── Day circle ────────────────────────────────────────────────────────────────
interface DayCircleProps {
  iso: string;
  visited: boolean;
  isToday: boolean;
  isFuture: boolean;
  inCurrentStreak: boolean;
  streakStart: boolean;
  streakEnd: boolean;
}

const DayCircle = ({ iso, visited, isToday, isFuture, inCurrentStreak, streakStart, streakEnd }: DayCircleProps) => {
  const d    = new Date(iso + 'T00:00:00');
  const day  = d.getDate();
  const dow  = RU_WEEKDAYS[d.getDay()];
  const mon  = RU_MONTHS[d.getMonth()];

  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ width: 36 }}>
      {/* День недели */}
      <span className={`text-[9px] font-bold uppercase ${
        isToday ? 'text-primary' : isWeekend ? 'text-purple' : 'text-text-tertiary'
      }`}>
        {dow}
      </span>

      {/* Коннектор серии слева */}
      <div className="relative w-full flex items-center justify-center">
        {/* Линия-мост между соседними визитами */}
        {inCurrentStreak && !streakStart && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-1.5 bg-primary/30" />
        )}
        {inCurrentStreak && !streakEnd && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-1.5 bg-primary/30" />
        )}

        {/* Кружок */}
        <motion.div
          whileTap={!isFuture ? { scale: 0.88 } : {}}
          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-all ${
            isToday && visited
              ? 'bg-gradient-primary text-white shadow-primary ring-2 ring-primary/30'
              : isToday && !visited
                ? 'bg-white border-2 border-primary text-primary animate-pulse shadow-primary/20 shadow-lg'
                : visited
                  ? 'bg-primary-light text-primary'
                  : isFuture
                    ? 'bg-transparent border border-dashed border-border text-text-tertiary opacity-40'
                    : 'bg-bg-muted text-text-tertiary opacity-60'
          }`}
        >
          {visited ? (
            isToday
              ? <span className="text-base">🐾</span>
              : <span className="text-xs">🐾</span>
          ) : isToday ? (
            <span className="text-[10px] font-black text-primary">!</span>
          ) : (
            <span className={`text-xs ${isFuture ? 'opacity-30' : 'opacity-50'}`}>{day}</span>
          )}
        </motion.div>
      </div>

      {/* Число + месяц (только для 1-го числа или сегодня) */}
      {(day === 1 || isToday) ? (
        <span className={`text-[9px] font-semibold ${isToday ? 'text-primary' : 'text-text-tertiary'}`}>
          {day === 1 ? mon : 'сег.'}
        </span>
      ) : (
        <span className="text-[9px] text-transparent select-none">·</span>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
export const StreakTracker = () => {
  const visitHistory  = useArenaStore(s => s.visitHistory);
  const streak        = useArenaStore(s => s.streak);
  const longestStreak = useArenaStore(s => s.longestStreak);

  const scrollRef = useRef<HTMLDivElement>(null);

  const today     = new Date().toISOString().slice(0, 10);
  const days      = getLastNDays(DAYS_SHOWN);
  const visitSet  = new Set(visitHistory);

  // Вычисляем, какие дни входят в текущую серию (от сегодня назад)
  const currentStreakDays = new Set<string>();
  if (streak > 0) {
    for (let i = 0; i < streak; i++) {
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() - i);
      currentStreakDays.add(d.toISOString().slice(0, 10));
    }
  }

  // Посещал ли сегодня
  const visitedToday = visitSet.has(today);
  // Был ли вчера (для подсказки)
  const yesterday = (() => { const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const visitedYesterday = visitSet.has(yesterday);

  // Итого уникальных дней посещения
  const totalDays = visitSet.size;

  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      {/* Шапка серии */}
      <div className="px-4 pt-4 pb-3 bg-gradient-to-r from-primary-light to-purple/10">
        <div className="flex items-center justify-between">
          {/* Серия */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
              streak > 0 ? 'bg-gradient-primary shadow-primary' : 'bg-bg-muted'
            }`}>
              {streakEmoji(streak)}
            </div>
            <div>
              <p className="text-base font-extrabold text-text-primary leading-tight">
                {streakLabel(streak)}
              </p>
              <p className="text-[11px] text-text-secondary leading-tight">
                {streakMotivation(streak)}
              </p>
            </div>
          </div>

          {/* Рекорд */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-warning">
              <Star size={13} fill="currentColor" />
              <span className="text-xs font-extrabold">{longestStreak}</span>
            </div>
            <p className="text-[10px] text-text-tertiary">рекорд</p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 divide-x divide-border-light border-b border-border-light">
        <Stat label="Всего дней" value={totalDays} icon="📅" />
        <Stat label="Текущая серия" value={streak} icon="🔥" highlight={streak > 0} />
        <Stat label="Рекорд" value={longestStreak} icon="🏆" />
      </div>

      {/* Подсказка если сегодня не заходил */}
      {!visitedToday && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mx-4 mt-3 flex items-center gap-2 bg-warning-light rounded-xl px-3 py-2"
        >
          <Flame size={14} className="text-warning flex-shrink-0" />
          <p className="text-xs text-warning font-semibold leading-snug">
            {visitedYesterday && streak > 0
              ? `Зайди сегодня — иначе серия в ${streak} ${streak === 1 ? 'день' : 'дня'} прервётся!`
              : 'Зайди сегодня и начни новую серию!'}
          </p>
        </motion.div>
      )}

      {/* Горизонтальный скролл-календарь */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide mb-2">
          Последние {DAYS_SHOWN} дней
        </p>
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {days.map((iso, idx) => {
            const visited = visitSet.has(iso);
            const isToday = iso === today;
            const isFuture = iso > today;
            const inStreak = currentStreakDays.has(iso);

            // Определяем начало/конец отрезка серии в видимом ряду
            const prevInStreak = idx > 0 && currentStreakDays.has(days[idx - 1]);
            const nextInStreak = idx < days.length - 1 && currentStreakDays.has(days[idx + 1]);
            const streakStart = inStreak && !prevInStreak;
            const streakEnd   = inStreak && !nextInStreak;

            return (
              <DayCircle
                key={iso}
                iso={iso}
                visited={visited}
                isToday={isToday}
                isFuture={isFuture}
                inCurrentStreak={inStreak}
                streakStart={streakStart}
                streakEnd={streakEnd}
              />
            );
          })}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-center gap-4 px-4 pb-3">
        <LegendItem color="bg-gradient-primary" label="Сегодня" />
        <LegendItem color="bg-primary-light" label="Был" />
        <LegendItem color="bg-bg-muted opacity-60" label="Не зашёл" />
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Stat({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center py-3 px-1">
      <span className="text-base mb-0.5">{icon}</span>
      <span className={`text-lg font-extrabold leading-none ${highlight ? 'text-primary' : 'text-text-primary'}`}>
        {value}
      </span>
      <span className="text-[10px] text-text-tertiary mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[10px] text-text-tertiary">{label}</span>
    </div>
  );
}
