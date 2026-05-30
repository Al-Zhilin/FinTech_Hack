import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Trophy, Gift, Swords, BookOpen, CalendarCheck, ArrowLeft, Check } from 'lucide-react';
import { useArenaStore, isDailyQuizDone, isStarterClaimed } from '@/entities/arena/model/arenaStore';
import { REWARDS } from '@/entities/arena/model/copyCat';
import { CopyCat } from './CopyCat';
import { QuizGame, type GameMode } from './QuizGame';
import { Shop } from './Shop';

type View = 'home' | 'play' | 'shop' | { mode: GameMode };

export const ArenaPage = () => {
  const coins = useArenaStore(s => s.coins);
  const rank = useArenaStore(s => s.rank);
  const checkIn = useArenaStore(s => s.checkIn);
  const claimStarterPack = useArenaStore(s => s.claimStarterPack);
  const dailyDone = useArenaStore(isDailyQuizDone);
  const starterClaimed = useArenaStore(isStarterClaimed);

  const [view, setView]       = useState<View>('home');
  const [festive, setFestive] = useState(false);
  const festiveTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { checkIn(); }, [checkIn]);

  const handleWin = useCallback(() => {
    setFestive(true);
    setView('home');
    if (festiveTimer.current) clearTimeout(festiveTimer.current);
    festiveTimer.current = setTimeout(() => setFestive(false), 4200);
  }, []);

  const handleWakeUp = useCallback(() => {
    setView({ mode: 'daily' });
  }, []);

  // ── Под-экраны ──
  if (typeof view === 'object') {
    return <QuizGame mode={view.mode} onExit={() => setView('home')} onWin={handleWin} />;
  }
  if (view === 'shop') {
    return <Shop onExit={() => setView('home')} />;
  }
  if (view === 'play') {
    return <PlaySelect onPick={(mode) => setView({ mode })} onBack={() => setView('home')} dailyDone={dailyDone} />;
  }

  // ── Главный экран Арены ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="relative flex flex-col min-h-dvh bg-gradient-to-b from-primary-light/50 to-bg-base px-5 pt-12 pb-6 overflow-hidden">

      {/* Верхняя строка: баланс + рейтинг */}
      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-1.5 bg-white shadow-card text-warning font-extrabold px-3.5 py-2 rounded-pill">
          <Coins size={18} /> <span className="text-text-primary">{coins}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white shadow-card px-3.5 py-2 rounded-pill">
          <Trophy size={16} className="text-primary" />
          <span className="text-sm font-bold text-text-primary">#{rank}</span>
          <span className="text-xs text-text-tertiary">за неделю</span>
        </div>
      </div>

      <div className="text-center mb-1 z-10">
        <h1 className="text-2xl font-extrabold text-text-primary">Арена</h1>
        <p className="text-sm text-text-secondary">Играй, копи монеты, корми КопиКота</p>
      </div>

      {/* Кот по центру */}
      <div className="flex-1 flex items-center justify-center my-2 z-10">
        <CopyCat size={240} festive={festive} onWakeUp={handleWakeUp} />
      </div>

      {/* Индикатор «вопроса дня» */}
      <button onClick={() => setView(dailyDone ? 'play' : { mode: 'daily' })}
        className={`flex items-center gap-2 self-center mb-4 px-4 py-2 rounded-pill text-sm font-bold z-10 transition-all ${
          dailyDone ? 'bg-success-light text-success' : 'bg-white shadow-card text-primary animate-pulse'}`}>
        {dailyDone ? <><Check size={15} /> Вопрос дня пройден</> : <><CalendarCheck size={15} /> Пройди вопрос дня · +{REWARDS.dailyQuestion}</>}
      </button>

      {/* Ежедневный стартовый пак */}
      {!starterClaimed && (
        <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={() => claimStarterPack()}
          className="flex items-center justify-center gap-2 self-center mb-4 px-4 py-2 rounded-pill text-sm font-bold bg-gradient-primary text-white shadow-primary z-10">
          <Gift size={16} /> Забрать стартовый пак · +{REWARDS.starterPack}
        </motion.button>
      )}

      {/* Две большие кнопки */}
      <div className="grid grid-cols-2 gap-3 z-10">
        <button onClick={() => setView('play')}
          className="flex flex-col items-center gap-1.5 py-5 rounded-3xl bg-gradient-primary text-white shadow-primary active:scale-[0.97] transition-transform">
          <Swords size={26} />
          <span className="font-extrabold text-lg">Сыграть</span>
        </button>
        <button onClick={() => setView('shop')}
          className="flex flex-col items-center gap-1.5 py-5 rounded-3xl bg-white shadow-card text-primary active:scale-[0.97] transition-transform">
          <Gift size={26} />
          <span className="font-extrabold text-lg">Витрина</span>
        </button>
      </div>
    </motion.div>
  );
};

// ── Экран выбора режима ──
function PlaySelect({ onPick, onBack, dailyDone }: { onPick: (m: GameMode) => void; onBack: () => void; dailyDone: boolean }) {
  const modes: { mode: GameMode; icon: typeof Swords; title: string; subtitle: string; accent: string; disabled?: boolean }[] = [
    { mode: 'solo',  icon: BookOpen,     title: 'Одиночный квиз', subtitle: '5 вопросов, без ставок — просто тренируйся', accent: 'bg-purple-light text-purple' },
    { mode: 'duel',  icon: Swords,       title: 'Дуэль',          subtitle: 'Против соперника · 5 вопросов по 15 сек', accent: 'bg-primary-light text-primary' },
    { mode: 'daily', icon: CalendarCheck, title: 'Вопрос дня',     subtitle: dailyDone ? 'Сегодня уже пройден' : 'Один вопрос · +25 монет', accent: 'bg-warning-light text-warning', disabled: dailyDone },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-dvh bg-bg-base px-5 pt-12 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-extrabold text-text-primary">Выбери игру</h1>
      </div>

      <div className="flex flex-col gap-3">
        {modes.map(({ mode, icon: Icon, title, subtitle, accent, disabled }) => (
          <button key={mode} onClick={() => !disabled && onPick(mode)} disabled={disabled}
            className={`flex items-center gap-4 p-4 rounded-3xl bg-white shadow-card text-left active:scale-[0.98] transition-transform ${disabled ? 'opacity-50' : ''}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${accent}`}>
              <Icon size={26} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-text-primary">{title}</p>
              <p className="text-sm text-text-secondary leading-snug">{subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <div className="flex items-start gap-2 bg-primary-light rounded-2xl px-4 py-3">
          <Swords size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary leading-snug">
            В дуэли побеждает самый быстрый и точный. Вопросы — термины простым языком,
            мини-кейсы и «угадай свои расходы».
          </p>
        </div>
      </div>
    </motion.div>
  );
}
