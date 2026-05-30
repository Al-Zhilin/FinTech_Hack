import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, Clock, Coins } from 'lucide-react';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import { useUserStore } from '@/entities/user/model/userStore';
import {
  getDuelQuestions, getDailyQuestion, getRandomBot,
  REWARDS, DUEL_STAKE, type ArenaQuestion, type Bot,
} from '@/entities/arena/model/copyCat';

export type GameMode = 'solo' | 'daily' | 'duel';
const TIME_PER_Q = 15;

interface QuizGameProps {
  mode: GameMode;
  onExit: () => void;
  onWin?: () => void;
}

export const QuizGame = ({ mode, onExit, onWin }: QuizGameProps) => {
  const addCoins = useArenaStore(s => s.addCoins);
  const markDailyQuizDone = useArenaStore(s => s.markDailyQuizDone);
  const userName = useUserStore(s => s.user?.name) || 'Вы';

  const questions = useMemo<ArenaQuestion[]>(
    () => (mode === 'daily' ? [getDailyQuestion()] : getDuelQuestions(5)),
    [mode],
  );
  const bot = useMemo<Bot>(() => getRandomBot(), []);
  const isDuel = mode === 'duel';

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [myScore, setMyScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [botPicked, setBotPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<'play' | 'result'>('play');
  const [coinsEarned, setCoinsEarned] = useState(0);

  const q = questions[idx];
  const botAnswerTime = useRef(0);
  const settled = useRef(false);

  const finish = useCallback((finalMy: number) => {
    let earned = 0;
    if (mode === 'solo') earned = finalMy * REWARDS.soloPerCorrect;
    else if (mode === 'daily') { earned = finalMy > 0 ? REWARDS.dailyQuestion : 5; markDailyQuizDone(); }
    else { /* duel — определяется после знания счёта бота, см. ниже */ }
    if (mode !== 'duel') { addCoins(earned); setCoinsEarned(earned); }
    setPhase('result');
  }, [mode, addCoins, markDailyQuizDone]);

  // Завершение дуэли с учётом счёта бота.
  const finishDuel = useCallback((finalMy: number, finalBot: number) => {
    const win = finalMy > finalBot;
    const draw = finalMy === finalBot;
    const earned = win ? REWARDS.duelWin : draw ? DUEL_STAKE : REWARDS.duelLose;
    addCoins(earned);
    setCoinsEarned(earned);
    if (win) onWin?.();
    setPhase('result');
  }, [addCoins, onWin]);

  const goNext = useCallback((myAdd: number, botAdd: number) => {
    const nextMy = myScore + myAdd;
    const nextBot = botScore + botAdd;
    setMyScore(nextMy);
    setBotScore(nextBot);
    if (idx + 1 >= questions.length) {
      if (isDuel) finishDuel(nextMy, nextBot);
      else finish(nextMy);
    } else {
      setIdx(idx + 1);
      setPicked(null);
      setBotPicked(null);
      setTimeLeft(TIME_PER_Q);
      settled.current = false;
    }
  }, [myScore, botScore, idx, questions.length, isDuel, finish, finishDuel]);

  // Решает раунд: считает очки и через паузу идёт дальше.
  const settleRound = useCallback((myChoice: number | null) => {
    if (settled.current) return;
    settled.current = true;
    const myCorrect = myChoice === q.correctAnswer ? 1 : 0;
    // Бот: если ещё не ответил (таймаут) — считаем, что промахнулся.
    const botChoice = botPicked;
    const botCorrect = botChoice === q.correctAnswer ? 1 : 0;
    setTimeout(() => goNext(myCorrect, botCorrect), 1500);
  }, [q, botPicked, goNext]);

  // Таймер обратного отсчёта.
  useEffect(() => {
    if (phase !== 'play' || picked !== null) return;
    if (timeLeft <= 0) { settleRound(null); return; }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, picked, timeLeft, settleRound]);

  // Бот «думает» и отвечает в случайный момент (имитация соперника).
  useEffect(() => {
    if (!isDuel || phase !== 'play') return;
    botAnswerTime.current = 1500 + Math.random() * 9000;
    const willBeRight = Math.random() < 0.65; // точность бота
    const t = setTimeout(() => {
      const choice = willBeRight
        ? q.correctAnswer
        : ([0, 1, 2, 3].filter(o => o !== q.correctAnswer)[Math.floor(Math.random() * 3)]);
      setBotPicked(choice);
    }, botAnswerTime.current);
    return () => clearTimeout(t);
  }, [isDuel, phase, idx, q]);

  const pick = (i: number) => {
    if (picked !== null || phase !== 'play') return;
    setPicked(i);
    settleRound(i);
  };

  const optClass = (i: number) => {
    if (picked === null) return 'bg-bg-muted border-transparent text-text-primary active:scale-[0.98]';
    if (i === q.correctAnswer) return 'bg-success-light border-success text-success';
    if (i === picked) return 'bg-danger-light border-danger text-danger';
    return 'bg-bg-muted border-transparent text-text-tertiary opacity-60';
  };

  // ── Экран результата ──
  if (phase === 'result') {
    const win = isDuel && myScore > botScore;
    const draw = isDuel && myScore === botScore;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-dvh px-6 text-center bg-bg-base">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
          className="text-7xl mb-4">
          {isDuel ? (win ? '🏆' : draw ? '🤝' : '🐾') : myScore > 0 ? '🎉' : '💪'}
        </motion.div>
        <h2 className="text-2xl font-extrabold text-text-primary mb-1">
          {isDuel ? (win ? 'Победа!' : draw ? 'Ничья!' : 'В этот раз не вышло') : 'Готово!'}
        </h2>
        <p className="text-text-secondary mb-1">
          {isDuel
            ? `${userName} ${myScore} : ${botScore} ${bot.name}`
            : `Правильных ответов: ${myScore} из ${questions.length}`}
        </p>
        {!win && isDuel && <p className="text-text-tertiary text-sm mb-4">КопиКот верит в тебя. Реванш?</p>}

        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex items-center gap-2 bg-warning-light text-warning font-extrabold px-5 py-2.5 rounded-pill mb-8">
          <Coins size={18} /> +{coinsEarned} монет
        </motion.div>

        <button onClick={onExit}
          className="w-full max-w-xs h-14 rounded-pill bg-gradient-primary text-white font-bold shadow-primary active:scale-[0.97] transition-transform">
          Вернуться на Арену
        </button>
      </motion.div>
    );
  }

  // ── Игровой экран ──
  return (
    <div className="flex flex-col min-h-dvh bg-bg-base px-5 pt-12 pb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onExit} className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-bold text-text-tertiary">
          Вопрос {idx + 1} / {questions.length}
        </span>
        <div className={`flex items-center gap-1.5 font-extrabold px-3 py-1.5 rounded-pill ${timeLeft <= 5 ? 'bg-danger-light text-danger' : 'bg-primary-light text-primary'}`}>
          <Clock size={15} /> {timeLeft}s
        </div>
      </div>

      {/* Полоса таймера */}
      <div className="h-1.5 rounded-full bg-bg-muted overflow-hidden mb-5">
        <motion.div className={`h-full ${timeLeft <= 5 ? 'bg-danger' : 'bg-gradient-primary'}`}
          animate={{ width: `${(timeLeft / TIME_PER_Q) * 100}%` }} transition={{ ease: 'linear' }} />
      </div>

      {/* Соперники (дуэль) */}
      {isDuel && (
        <div className="flex items-center justify-between mb-5">
          <Fighter name={userName} emoji="🙂" score={myScore} answered={picked !== null} side="you" />
          <span className="text-text-tertiary font-black text-lg">VS</span>
          <Fighter name={bot.name} emoji={bot.emoji} score={botScore} answered={botPicked !== null} side="bot" />
        </div>
      )}

      {/* Вопрос */}
      <AnimatePresence mode="wait">
        <motion.div key={q.id}
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
          className="flex-1">
          {q.personal && (
            <span className="inline-block text-[11px] font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full mb-3">
              🔮 Угадай свои расходы
            </span>
          )}
          <h2 className="text-xl font-extrabold text-text-primary leading-snug mb-6">{q.question}</h2>

          <div className="flex flex-col gap-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => pick(i)} disabled={picked !== null}
                className={`flex items-center justify-between gap-3 w-full text-left px-4 py-4 rounded-2xl border-2 font-semibold transition-all ${optClass(i)}`}>
                <span>{opt}</span>
                {picked !== null && i === q.correctAnswer && <Check size={20} className="flex-shrink-0" />}
                {picked !== null && i === picked && i !== q.correctAnswer && <X size={20} className="flex-shrink-0" />}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {picked !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-5 bg-bg-muted rounded-2xl px-4 py-3">
                <p className="text-sm text-text-secondary leading-snug">
                  <span className="font-bold text-text-primary">
                    {picked === q.correctAnswer ? 'Верно! ' : 'Почти. '}
                  </span>
                  {q.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

function Fighter({ name, emoji, score, answered, side }: { name: string; emoji: string; score: number; answered: boolean; side: 'you' | 'bot' }) {
  return (
    <div className={`flex items-center gap-2 ${side === 'bot' ? 'flex-row-reverse text-right' : ''}`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl relative ${answered ? 'ring-2 ring-success' : 'bg-bg-muted'}`}
           style={{ background: answered ? undefined : undefined }}>
        <span>{emoji}</span>
        {answered && <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success text-white text-[9px] flex items-center justify-center">✓</span>}
      </div>
      <div>
        <p className="text-xs font-bold text-text-primary leading-tight max-w-[80px] truncate">{name}</p>
        <p className="text-[11px] text-text-tertiary">очки: {score}</p>
      </div>
    </div>
  );
}
