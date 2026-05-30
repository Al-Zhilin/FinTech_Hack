import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Info, Sparkles, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useUserGoalsStore } from '@/entities/goal/model/userGoalsStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { analyzeGoal } from '@/entities/goal/model/goalAnalysis';
import { formatCurrency } from '@/shared/lib/formatters';
import { AskAiButton } from '@/features/ask-ai';
import type { Goal } from '@/shared/types';

const STATE_CFG = [
  { min: 65, emoji: '🟢', label: 'Стабильно', cls: 'text-success' },
  { min: 40, emoji: '🟡', label: 'Под контролем', cls: 'text-warning' },
  { min: 0,  emoji: '🔴', label: 'Требует внимания', cls: 'text-danger' },
];

const monthsWord = (n: number) => {
  const a = Math.abs(n) % 100, b = a % 10;
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

  const income = user?.income || profile.monthlyIncome;
  const expenses = user?.monthlyExpenses || profile.monthlySpent;
  const credit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;
  const freeCash = Math.max(0, income - expenses - credit);
  const health = user?.analysis?.healthScore ?? (100 - profile.stressScore);
  const state = STATE_CFG.find(s => health >= s.min)!;

  const goals = useMemo<Goal[]>(
    () => (userGoals.length ? userGoals : profile.goals),
    [userGoals, profile.goals],
  );
  const finance = { income, expenses: expenses + credit };

  // ── Сегодняшние доход/расход ──
  const today = useMemo(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    let inc = 0, exp = 0;
    for (const t of userTx) {
      if (+new Date(t.date) < +from) continue;
      if (t.type === 'income') inc += t.amount; else exp += t.amount;
    }
    return { inc, exp, net: inc - exp };
  }, [userTx]);

  // ── Ротация целей каждые 3 сек ──
  const [gi, setGi] = useState(0);
  useEffect(() => {
    if (goals.length < 2) return;
    const id = setInterval(() => setGi(i => (i + 1) % goals.length), 3000);
    return () => clearInterval(id);
  }, [goals.length]);
  const goal = goals[gi % Math.max(1, goals.length)];
  const ga = goal ? analyzeGoal(goal, finance) : null;

  // ── Прогноз через год ──
  const yearSavings = freeCash * 12;
  const yearDebt = Math.max(0, credit * 12 - credit * 12); // при выплате долг закрывается
  const yearHealth = Math.min(100, health + (freeCash > 0 ? 12 : 0));

  // ── Рекомендация дня ──
  const recommendation = credit > 0
    ? { title: 'Сфокусируйтесь на долге', body: `Сейчас не лучшее время для нового кредита. Направьте свободные ${formatCurrency(freeCash, true)} на досрочное погашение.` }
    : freeCash > 2000
      ? { title: 'Не оформляйте новый кредит', body: `Вы можете безопасно увеличить накопления на ${formatCurrency(Math.round(freeCash * 0.1 / 100) * 100, true)} в месяц.` }
      : { title: 'Соберите подушку', body: 'Начните откладывать хотя бы 5% дохода — это первый шаг к финансовой стабильности.' };

  // ── Сценарий по цели (+1000 ₽/мес) ──
  const scenario = (() => {
    if (!goal || !ga || ga.remaining <= 0) return null;
    const base = Math.max(1000, ga.recommendedMonthly || ga.requiredMonthly);
    const baseMonths = Math.ceil(ga.remaining / base);
    const fasterMonths = Math.ceil(ga.remaining / (base + 1000));
    const saved = baseMonths - fasterMonths;
    if (saved <= 0) return null;
    return { saved };
  })();

  // ── Бегунок баланса дня ──
  const dayFlow = today.inc + today.exp;
  const balancePos = dayFlow > 0 ? Math.round((today.inc / dayFlow) * 100) : 50;
  const [tip, setTip] = useState(false);

  return (
    <div className="flex flex-col gap-4 px-5">
      {/* ── Финансовое состояние + свободные деньги ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 bg-gradient-primary text-white shadow-primary relative overflow-hidden">
        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-white/80 text-sm">Ваше финансовое состояние</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{state.emoji}</span>
            <span className="text-2xl font-bold">{state.label}</span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/70 text-xs mb-0.5">Свободных денег</p>
              <p className="text-3xl font-bold">{formatCurrency(freeCash)}</p>
            </div>
            {/* Баланс дня + бегунок + инфо */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 relative">
                <p className="text-white/70 text-xs">Баланс дня</p>
                <button onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)} onClick={() => setTip(v => !v)}>
                  <Info size={13} className="text-white/70" />
                </button>
                <AnimatePresence>
                  {tip && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute top-5 right-0 z-20 w-52 bg-white text-text-secondary text-[11px] leading-snug rounded-xl p-2.5 shadow-card-hover text-left">
                      Баланс дня — разница между доходами и расходами за сегодня. Зелёная зона — в плюсе.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className={`text-xl font-bold ${today.net >= 0 ? 'text-white' : 'text-white'}`}>
                {today.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(today.net), true)}
              </p>
            </div>
          </div>

          {/* Бегунок баланса дня */}
          <div className="mt-3">
            <div className="relative h-2 rounded-full bg-white/20 overflow-hidden">
              <motion.div className="absolute inset-y-0 left-0 bg-white rounded-full"
                initial={{ width: 0 }} animate={{ width: `${balancePos}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-white/80">
              <span className="flex items-center gap-1"><ArrowDownRight size={12} /> +{formatCurrency(today.inc, true)}</span>
              <span className="flex items-center gap-1">−{formatCurrency(today.exp, true)} <ArrowUpRight size={12} /></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── До цели (ротация) ── */}
      {goal && ga && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white shadow-card p-4">
          <p className="text-xs text-text-tertiary mb-1">До цели</p>
          <AnimatePresence mode="wait">
            <motion.div key={goal.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{goal.icon}</span>
                <span className="font-bold text-text-primary truncate">{goal.title}</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {ga.remaining <= 0 ? 'Достигнута 🎉' : `${ga.monthsLeft} ${monthsWord(ga.monthsLeft)}`}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {formatCurrency(goal.current, true)} из {formatCurrency(goal.target, true)}
              </p>
            </motion.div>
          </AnimatePresence>
          {goals.length > 1 && (
            <div className="flex gap-1 mt-3">
              {goals.map((g, i) => (
                <span key={g.id} className={`h-1 rounded-full transition-all ${i === gi % goals.length ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Рекомендация дня ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 bg-gradient-card-purple border border-purple/15">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-lg bg-purple/15 flex items-center justify-center text-purple"><Sparkles size={15} /></span>
          <p className="text-xs font-bold text-purple uppercase tracking-wide">Сегодняшняя рекомендация</p>
        </div>
        <p className="font-bold text-text-primary mb-1">{recommendation.title}</p>
        <p className="text-sm text-text-secondary leading-snug mb-3">{recommendation.body}</p>
        <AskAiButton variant="chip" question={`${recommendation.title}. ${recommendation.body} Объясни подробнее на моих данных.`} label="Почему так?" />
      </motion.div>

      {/* ── Прогноз через год ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-success" />
          <p className="text-sm font-bold text-text-primary">Если ничего не менять — прогноз через год</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-success-light rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">Накопления</p>
            <p className="font-bold text-sm text-success">{formatCurrency(yearSavings, true)}</p>
          </div>
          <div className="bg-bg-muted rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">Долги</p>
            <p className="font-bold text-sm text-text-primary">{formatCurrency(yearDebt, true)}</p>
          </div>
          <div className="bg-primary-light rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">Здоровье</p>
            <p className="font-bold text-sm text-primary">{yearHealth}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Карточка цели: прогресс + AI-план + сценарий ── */}
      {goal && ga && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white shadow-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{goal.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text-primary truncate">{goal.title}</p>
              <p className="text-xs text-text-tertiary">{formatCurrency(goal.target)}</p>
            </div>
          </div>

          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="text-text-secondary">{formatCurrency(goal.current, true)}</span>
            <span className="text-text-tertiary">{formatCurrency(goal.target, true)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-border-light overflow-hidden mb-3">
            <motion.div className="h-full bg-gradient-primary rounded-full"
              initial={{ width: 0 }} animate={{ width: `${ga.pct}%` }} transition={{ duration: 0.8 }} />
          </div>

          {/* AI план */}
          <div className="flex items-start gap-2 bg-bg-muted rounded-xl p-3 mb-2">
            <ShieldCheck size={15} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-secondary leading-snug">
              <span className="font-semibold text-text-primary">AI-план:</span> откладывайте по {formatCurrency(ga.requiredMonthly, true)} в месяц.
            </p>
          </div>

          {/* Сценарий */}
          {scenario && (
            <div className="flex items-start gap-2 bg-success-light rounded-xl p-3">
              <TrendingDown size={15} className="text-success mt-0.5 flex-shrink-0" />
              <p className="text-sm text-text-secondary leading-snug">
                Если увеличить взнос на {formatCurrency(1000)} — цель ближе на <span className="font-bold text-success">{scenario.saved} {monthsWord(scenario.saved)}</span>.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
