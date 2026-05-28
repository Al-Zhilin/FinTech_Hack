import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { formatCurrency, getGreeting } from '@/shared/lib/formatters';
import type { AiInsight, CategorySummary, Goal } from '@/shared/types';

// ─── Stagger animation ─────────────────────────────────────────────────────────
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

// ─── Week calendar strip ───────────────────────────────────────────────────────
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const WeekStrip = () => {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  return (
    <div className="flex justify-between items-center px-1">
      {DAYS.map((d, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const isToday = date.toDateString() === today.toDateString();
        const dayNum = date.getDate();
        return (
          <div key={d} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-medium text-text-tertiary">{d}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              isToday ? 'bg-text-primary text-white shadow-card' : 'text-text-secondary'
            }`}>
              {dayNum}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Insight card ──────────────────────────────────────────────────────────────

const InsightCard = ({ insight, onDismiss }: { insight: AiInsight; onDismiss: () => void }) => {
  const configs = {
    warning: { bg: 'bg-warning-light', text: 'text-warning', icon: '⚠️', badge: 'warning' as const },
    success: { bg: 'bg-success-light', text: 'text-success', icon: '✅', badge: 'success' as const },
    tip:     { bg: 'bg-primary-light',  text: 'text-primary',  icon: '💡', badge: 'primary' as const },
    forecast:{ bg: 'bg-danger-light',   text: 'text-danger',   icon: '📊', badge: 'danger' as const },
  };
  const c = configs[insight.type];

  return (
    <div className={`${c.bg} rounded-xl p-4 relative`}>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center text-text-tertiary text-lg leading-none"
      >×</button>
      <div className="pr-5">
        <p className="text-xs font-semibold text-text-tertiary mb-1 uppercase tracking-wide">
          {insight.type === 'warning' ? 'Инсайт дня' : insight.type === 'forecast' ? 'Прогноз' : insight.type === 'success' ? 'Результат' : 'Совет'}
        </p>
        <p className={`font-bold text-base ${c.text} mb-1`}>{insight.title}</p>
        <p className="text-sm text-text-secondary leading-snug">{insight.body}</p>
        {insight.action && (
          <button className={`text-sm font-semibold ${c.text} mt-2 flex items-center gap-1`}>
            {insight.action} →
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Goal card (horizontal scroll) ────────────────────────────────────────────

const GoalCard = ({ goal }: { goal: Goal }) => {
  const pct = Math.round((goal.current / goal.target) * 100);
  return (
    <div className="flex-shrink-0 w-44 rounded-xl p-4 shadow-card bg-white border border-border-light">
      <div className="text-xl mb-2">{goal.icon}</div>
      <p className="text-xs text-text-tertiary mb-0.5 font-medium">Цель</p>
      <p className="font-bold text-sm text-text-primary leading-tight mb-3">{goal.title}</p>
      <div className="mb-2">
        <div className="flex justify-between text-xs font-medium mb-1">
          <span className="text-text-secondary">{formatCurrency(goal.current, true)}</span>
          <span className="text-text-tertiary">{formatCurrency(goal.target, true)}</span>
        </div>
        <ProgressBar value={pct} color="primary" size="xs" />
      </div>
      <Badge variant="primary">{pct}%</Badge>
    </div>
  );
};

// ─── Category bar ──────────────────────────────────────────────────────────────

const CategoryRow = ({ cat }: { cat: CategorySummary }) => {
  const pct = Math.round((cat.amount / cat.budget) * 100);
  const over = pct > 100;
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
           style={{ backgroundColor: cat.color + '20' }}>
        {cat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-text-primary truncate">{cat.label}</span>
          <span className={`text-sm font-semibold ${over ? 'text-danger' : 'text-text-primary'}`}>
            {formatCurrency(cat.amount, true)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-border-light overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: over ? '#FF3B30' : cat.color }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const user = useUserStore(s => s.user);
  const { profile, isLoading, fetchProfile } = useFinanceStore();
  const [visibleInsights, setVisibleInsights] = useState(profile.insights);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    setVisibleInsights(profile.insights);
  }, [profile.insights]);

  const dismissInsight = (id: string) =>
    setVisibleInsights(prev => prev.filter(i => i.id !== id));

  const spentPct = Math.round((profile.monthlySpent / profile.monthlyBudget) * 100);
  const firstName = user?.name.split(' ')[0] ?? 'Гость';

  return (
    <motion.div
      className="flex flex-col bg-bg-base min-h-dvh"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ── Header ── */}
      <motion.div variants={item} className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-primary">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-text-tertiary text-sm">{getGreeting()},</p>
              <h1 className="text-xl font-bold text-text-primary">{firstName}</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8"/>
            </svg>
          </button>
        </div>
      </motion.div>

      {/* ── Week strip ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <Card variant="default" padding="md">
          <WeekStrip />
        </Card>
      </motion.div>

      {/* ── Hero balance card ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1C1C2E] to-[#2D2D44] text-white relative overflow-hidden shadow-card-hover">
          {/* Decorative glow */}
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-purple/20 blur-xl" />

          <div className="relative z-10">
            <p className="text-white/60 text-sm font-medium mb-1">Общий баланс</p>
            <div className="flex items-end gap-2 mb-5">
              <h2 className="text-4xl font-bold">{formatCurrency(profile.balance)}</h2>
            </div>

            <div className="flex gap-4 mb-5">
              <div className="flex-1">
                <p className="text-white/50 text-xs mb-1">Доход</p>
                <p className="font-semibold text-success">{formatCurrency(profile.monthlyIncome, true)}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex-1">
                <p className="text-white/50 text-xs mb-1">Расходы</p>
                <p className="font-semibold text-white">{formatCurrency(profile.monthlySpent, true)}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex-1">
                <p className="text-white/50 text-xs mb-1">Сбережения</p>
                <p className="font-semibold text-purple">{profile.savingsRate}%</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>Бюджет месяца</span>
                <span>{spentPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${spentPct > 90 ? 'bg-danger' : spentPct > 70 ? 'bg-warning' : 'bg-success'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${spentPct}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── AI Insights ── */}
      {visibleInsights.length > 0 && (
        <motion.div variants={item} className="px-5 mb-4 flex flex-col gap-3">
          {visibleInsights.slice(0, 2).map(insight => (
            <InsightCard key={insight.id} insight={insight} onDismiss={() => dismissInsight(insight.id)} />
          ))}
        </motion.div>
      )}

      {/* ── Goals horizontal scroll ── */}
      <motion.div variants={item} className="mb-4">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-lg font-bold text-text-primary">Обзор</h2>
          <span className="text-xs text-text-tertiary">Листай вправо →</span>
        </div>
        <div ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1">
          {profile.goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      </motion.div>

      {/* ── Expenses breakdown ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <Card variant="default" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text-primary">Расходы за месяц</h2>
            <Badge variant="muted">{new Date().toLocaleString('ru', { month: 'long' })}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {profile.categories.slice(0, 5).map(cat => (
              <CategoryRow key={cat.category} cat={cat} />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Upcoming payments ── */}
      <motion.div variants={item} className="px-5 mb-6">
        <Card variant="default" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text-primary">Ближайшие платежи</h2>
            <Badge variant="danger">×{profile.upcomingPayments.length}</Badge>
          </div>
          <div className="flex flex-col divide-y divide-border-light">
            {profile.upcomingPayments.map(p => {
              const date = new Date(p.nextDate);
              const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
              return (
                <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                       style={{ backgroundColor: p.color + '20' }}>
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-text-primary">{p.title}</p>
                    <p className="text-xs text-text-tertiary">через {daysLeft} дн.</p>
                  </div>
                  <span className="font-bold text-sm text-text-primary">−{formatCurrency(p.amount)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

// Need useState import
import { useState } from 'react';
