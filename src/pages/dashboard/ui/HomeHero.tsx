import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, TrendingUp, ShieldCheck, Sparkles, ArrowDownRight, ArrowUpRight,
  Target, Wallet,
} from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useUserGoalsStore } from '@/entities/goal/model/userGoalsStore';
import { analyzeGoal } from '@/entities/goal/model/goalAnalysis';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { MOCK_TRANSACTIONS } from '@/entities/finance/model/transactions';
import { AskAiButton } from '@/features/ask-ai';
import { formatCurrency } from '@/shared/lib/formatters';
import type { Goal, Transaction } from '@/shared/types';

const BG = '#E8856A';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const monthsWord = (n: number) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'месяцев';
  if (b > 1 && b < 5) return 'месяца';
  if (b === 1) return 'месяц';
  return 'месяцев';
};

export const HomeHero = () => {
  const user = useUserStore(s => s.user);
  const profile = useFinanceStore(s => s.profile);
  const { goals: userGoals } = useUserGoalsStore();
  const { txs: userTx } = useUserTxStore();

  const income = user?.income ?? profile.monthlyIncome;
  const expenses = user?.monthlyExpenses ?? profile.monthlySpent;
  const existingCredit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;
  const freeCash = Math.max(0, income - expenses - existingCredit);

  const health = user?.analysis?.healthScore ?? (100 - profile.stressScore);
  const state = health >= 65
    ? { emoji: '🟢', label: 'Стабильно', cls: 'bg-success-light text-success' }
    : health >= 40
      ? { emoji: '🟡', label: 'Под контролем', cls: 'bg-warning-light text-warning' }
      : { emoji: '🔴', label: 'Требует внимания', cls: 'bg-danger-light text-danger' };

  // ── Сегодняшние доход/расход ──
  const allTx = useMemo<Transaction[]>(() => [...userTx, ...MOCK_TRANSACTIONS], [userTx]);
  const { todayIncome, todayExpense } = useMemo(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(); to.setHours(23, 59, 59, 999);
    let inc = 0, exp = 0;
    for (const t of allTx) {
      const d = +new Date(t.date);
      if (d < +from || d > +to) continue;
      if (t.type === 'income') inc += t.amount; else exp += t.amount;
    }
    return { todayIncome: inc, todayExpense: exp };
  }, [allTx]);

  // дневной бюджет и заполненность «бегунка»
  const dailyBudget = Math.max(1, Math.round(profile.monthlyBudget / 30));
  const dayFill = Math.min(100, Math.round((todayExpense / dailyBudget) * 100));

  // ── Цели для ротации + спотлайт ──
  const goals = useMemo<Goal[]>(() => [...userGoals, ...profile.goals], [userGoals, profile.goals]);
  const [goalIdx, setGoalIdx] = useState(0);
  useEffect(() => {
    if (goals.length < 2) return;
    const id = setInterval(() => setGoalIdx(i => (i + 1) % goals.length), 3000);
    return () => clearInterval(id);
  }, [goals.length]);

  const rotGoal = goals[goalIdx % Math.max(1, goals.length)];
  const rotA = rotGoal ? analyzeGoal(rotGoal, { income, expenses }) : null;

  const spotlight = goals[0];
  const spotA = spotlight ? analyzeGoal(spotlight, { income, expenses }) : null;

  // сценарий «+1000 ₽ в месяц»
  const scenario = (() => {
    if (!spotlight || !spotA || spotA.requiredMonthly <= 0) return null;
    const base = spotA.requiredMonthly;
    const remaining = spotlight.target - spotlight.current;
    const cur = Math.ceil(remaining / base);
    const faster = Math.ceil(remaining / (base + 1000));
    const earlier = cur - faster;
    return earlier > 0 ? earlier : null;
  })();

  // ── Прогноз через год ──
  const projectedSavings = Math.round(profile.balance + freeCash * 12);
  const projectedHealth = Math.min(100, health + (freeCash > 0 ? 10 : -5));
  const safeIncrease = Math.max(500, Math.round((freeCash * 0.1) / 100) * 100);

  return (
    <div className="flex flex-col gap-4 px-5 mb-4">

      {/* ── Состояние + свободные деньги + ротация цели ── */}
      <motion.div {...fadeUp} className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-text-secondary">Ваше финансовое состояние</p>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${state.cls}`}>{state.emoji} {state.label}</span>
        </div>

        <p className="text-xs text-text-tertiary">Свободных денег</p>
        <p className="text-3xl font-bold text-text-primary mb-3">{formatCurrency(freeCash)}</p>

        {rotGoal && rotA && (
          <div className="bg-bg-muted rounded-xl px-4 py-3 overflow-hidden">
            <p className="text-xs text-text-tertiary mb-0.5">До цели</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={rotGoal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm font-semibold text-text-primary truncate">{rotGoal.icon} {rotGoal.title}</span>
                <span className="text-sm font-bold text-primary flex-shrink-0">
                  {rotA.etaMonths ? `${rotA.etaMonths} ${monthsWord(rotA.etaMonths)}` : '—'}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ── Общий баланс (фирменный цвет) ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}
        className="rounded-2xl p-5 text-white relative overflow-hidden shadow-card-hover"
        style={{ background: `linear-gradient(135deg, ${BG} 0%, #FF9A7E 100%)` }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/15 blur-2xl" />
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-1">Общий баланс</p>
          <h2 className="text-4xl font-bold mb-4">{formatCurrency(profile.balance)}</h2>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-white/15 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-0.5"><ArrowDownRight size={14} /><span className="text-xs text-white/80">Доход сегодня</span></div>
              <p className="font-bold">{todayIncome > 0 ? formatCurrency(todayIncome, true) : '0 ₽'}</p>
            </div>
            <div className="flex-1 bg-white/15 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-0.5"><ArrowUpRight size={14} /><span className="text-xs text-white/80">Расход сегодня</span></div>
              <p className="font-bold">{formatCurrency(todayExpense, true)}</p>
            </div>
          </div>

          {/* Бегунок баланса дня + инфо */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs text-white/80">Баланс дня</span>
            <InfoDot text={`Баланс дня — сколько вы потратили из дневного бюджета (${formatCurrency(dailyBudget, true)} = месячный бюджет ÷ 30).`} />
            <span className="ml-auto text-xs text-white/80">{dayFill}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${dayFill > 90 ? 'bg-white' : 'bg-white/90'}`}
              initial={{ width: 0 }}
              animate={{ width: `${dayFill}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Сегодняшняя рекомендация (AI) ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center"><Sparkles size={15} className="text-primary" /></span>
          <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide">Сегодняшняя рекомендация</p>
        </div>
        <p className="text-[15px] font-semibold text-text-primary leading-snug mb-1">
          {existingCredit > 0 ? 'Не оформляйте новый кредит.' : 'Держите курс — вы на верном пути.'}
        </p>
        <p className="text-sm text-text-secondary leading-snug mb-3">
          Вы можете безопасно увеличить накопления на {formatCurrency(safeIncrease)}.
        </p>
        <AskAiButton
          variant="chip"
          question={`Дай мне персональную рекомендацию на сегодня. Свободно ${freeCash} ₽, доход ${income} ₽, расходы ${expenses} ₽${existingCredit > 0 ? `, плачу по кредитам ${existingCredit} ₽/мес` : ''}.`}
          label="Почему так?"
        />
      </motion.div>

      {/* ── Прогноз через год ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-2xl p-5 bg-gradient-card-purple border border-purple/15">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-purple" />
          <p className="text-xs font-bold text-purple uppercase tracking-wide">Если ничего не менять · прогноз через год</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <Wallet size={15} className="text-purple mx-auto mb-1" />
            <p className="text-[10px] text-text-tertiary">Накопления</p>
            <p className="text-sm font-bold text-text-primary">{formatCurrency(projectedSavings, true)}</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <ShieldCheck size={15} className="text-purple mx-auto mb-1" />
            <p className="text-[10px] text-text-tertiary">Долги</p>
            <p className="text-sm font-bold text-text-primary">{existingCredit > 0 ? 'снизятся' : '0 ₽'}</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <TrendingUp size={15} className="text-purple mx-auto mb-1" />
            <p className="text-[10px] text-text-tertiary">Здоровье</p>
            <p className="text-sm font-bold text-text-primary">{projectedHealth}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Спотлайт цели + AI-план + сценарий ── */}
      {/* {spotlight && spotA && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-primary" />
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide">Ваша цель</p>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: (spotlight.color ?? BG) + '20' }}>{spotlight.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text-primary truncate">{spotlight.title}</p>
              <p className="text-xs text-text-tertiary">{formatCurrency(spotlight.current, true)} / {formatCurrency(spotlight.target, true)}</p>
            </div>
            <span className="text-lg font-bold text-primary">{spotA.pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-border-light overflow-hidden mb-4">
            <motion.div className="h-full rounded-full bg-gradient-primary" initial={{ width: 0 }} animate={{ width: `${spotA.pct}%` }} transition={{ duration: 0.9 }} />
          </div>

          <div className="bg-primary-light rounded-xl px-4 py-3 mb-2">
            <p className="text-xs text-text-tertiary mb-0.5">AI-план</p>
            <p className="text-sm font-semibold text-text-primary">Откладывайте по {formatCurrency(spotA.requiredMonthly)} в месяц</p>
          </div>

          {scenario && (
            <div className="flex items-start gap-2 bg-success-light rounded-xl px-4 py-3">
              <Sparkles size={15} className="text-success mt-0.5 flex-shrink-0" />
              <p className="text-sm text-text-secondary leading-snug">
                Если увеличить накопления на {formatCurrency(1000)} — цель достигнется на <b className="text-success">{scenario} {monthsWord(scenario)}</b> раньше.
              </p>
            </div>
          )}
        </motion.div>
      )} */}
    </div>
  );
};

// ─── Info tooltip dot ────────────────────────────────────────────────────────────

const InfoDot = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setShow(s => !s)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center"
      >
        <Info size={11} className="text-white" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            className="absolute left-0 bottom-6 z-20 w-56 bg-text-primary text-white text-[11px] leading-snug rounded-xl p-3 shadow-card-hover"
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};
