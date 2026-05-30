import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { MOCK_TRANSACTIONS } from '@/entities/finance/model/transactions';
import { analyzeDay } from '@/entities/finance/model/dayAnalytics';
import { byCategory, summarize } from '@/entities/finance/model/financeSelectors';
import { getCategoryMeta } from '@/entities/finance/model/categoryMeta';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { formatCurrency, getGreeting } from '@/shared/lib/formatters';
import type { AiInsight, CategorySummary, Goal, Transaction } from '@/shared/types';
import { AnalyticsModal } from '@/widgets/AnalyticsModal';
import { AddTransactionSheet } from '@/features/add-transaction';
import { AskAiButton, useAskAi } from '@/features/ask-ai';
import { HomeHero } from './HomeHero';

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

export const getWeekDates = (): Date[] => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const WeekStrip = ({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) => {
  const today = new Date();
  const dates = getWeekDates();

  return (
    <div className="flex justify-between items-center px-1">
      {dates.map((date, i) => {
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === selected.toDateString();
        const isFuture = date.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
        const d2 = dates[i]; // restore (setHours mutated)
        const dayNum = d2.getDate();
        return (
          <button
            key={i}
            disabled={isFuture}
            onClick={() => onSelect(dates[i])}
            className="flex flex-col items-center gap-1.5 disabled:opacity-30"
          >
            <span className={`text-[11px] font-medium ${isToday ? 'text-primary' : 'text-text-tertiary'}`}>{DAYS[i]}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${isSelected ? 'bg-gradient-primary text-white shadow-primary'
                : isToday ? 'bg-text-primary text-white shadow-card'
                  : 'text-text-secondary hover:bg-bg-muted'
              }`}>
              {dayNum}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// ─── Day detail (для прошедших дней) ──────────────────────────────────────────────

const DayDetail = ({ date, txs }: { date: Date; txs: Transaction[] }) => {
  const from = new Date(date); from.setHours(0, 0, 0, 0);
  const to = new Date(date); to.setHours(23, 59, 59, 999);
  const dayTx = txs
    .filter(t => { const d = +new Date(t.date); return d >= +from && d <= +to; })
    .sort((a, b) => b.amount - a.amount);
  const sum = summarize(dayTx);
  const cats = byCategory(dayTx, 'expense');
  const a = analyzeDay(txs, date, getWeekDates());
  const dateLabel = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      {/* Сводка дня */}
      <motion.div variants={item} className="px-5 mb-4">
        <div className="rounded-2xl p-5 bg-gradient-card-pink border border-primary/15">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-wide">Сводка дня</p>
              <h2 className="text-lg font-bold text-text-primary capitalize">{dateLabel}</h2>
            </div>
            <span className="text-xs text-text-tertiary">{a.count} операций</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded-xl p-3">
              <p className="text-xs text-text-tertiary">Расход</p>
              <p className="font-bold text-danger">{formatCurrency(sum.expense)}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-3">
              <p className="text-xs text-text-tertiary">Доход</p>
              <p className="font-bold text-success">{sum.income > 0 ? formatCurrency(sum.income) : '—'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Что интересного */}
      {a.facts.length > 0 && (
        <motion.div variants={item} className="px-5 mb-4">
          <Card variant="default" padding="lg">
            <h3 className="text-base font-bold text-text-primary mb-3">Что интересного 👀</h3>
            <div className="flex flex-col gap-2">
              {a.facts.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-text-secondary leading-snug">{f}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Расходы по категориям за день */}
      {cats.length > 0 && (
        <motion.div variants={item} className="px-5 mb-4">
          <Card variant="default" padding="lg">
            <h3 className="text-base font-bold text-text-primary mb-4">Расходы по категориям</h3>
            <div className="flex flex-col gap-3">
              {cats.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: c.color + '20' }}>{c.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-text-primary truncate">{c.label}</span>
                      <span className="text-sm font-semibold text-text-primary">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-border-light overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Операции дня */}
      <motion.div variants={item} className="px-5 mb-4">
        <Card variant="default" padding="lg">
          <h3 className="text-base font-bold text-text-primary mb-3">Операции дня</h3>
          {dayTx.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">В этот день операций не было 👌</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dayTx.map(t => {
                const m = getCategoryMeta(t.category);
                const inc = t.type === 'income';
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: m.color + '20' }}>{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">{t.title}</p>
                      <p className="text-xs text-text-tertiary">{m.label} · {t.method === 'cash' ? 'наличные' : 'карта'}</p>
                    </div>
                    <span className={`font-bold text-sm ${inc ? 'text-success' : 'text-text-primary'}`}>{inc ? '+' : '−'}{formatCurrency(t.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* AI */}
      {dayTx.length > 0 && (
        <motion.div variants={item} className="px-5 mb-6">
          <AskAiButton
            variant="solid"
            question={`Разбери мой день (${dateLabel}): потрачено ${sum.expense} ₽${cats[0] ? `, больше всего на «${cats[0].label}»` : ''}. Это нормально для меня и что можно улучшить?`}
            label="Разобрать день с AI"
          />
        </motion.div>
      )}
    </>
  );
};

// ─── Insight card ──────────────────────────────────────────────────────────────

const InsightCard = ({ insight, onDismiss }: { insight: AiInsight; onDismiss: () => void }) => {
  const ask = useAskAi();
  const configs = {
    warning: { bg: 'bg-warning-light', text: 'text-warning', icon: '⚠️', badge: 'warning' as const },
    success: { bg: 'bg-success-light', text: 'text-success', icon: '✅', badge: 'success' as const },
    tip: { bg: 'bg-primary-light', text: 'text-primary', icon: '💡', badge: 'primary' as const },
    forecast: { bg: 'bg-danger-light', text: 'text-danger', icon: '📊', badge: 'danger' as const },
  };
  const c = configs[insight.type];

  // Готовый промт из текста инсайта — пользователю не нужно ничего формулировать
  const question = `Разбери подробнее: «${insight.title}». ${insight.body} Что мне с этим делать?`;

  return (
    <div className={`${c.bg} rounded-xl p-4 relative`}>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center text-text-tertiary text-lg leading-none"
      >×</button>
      <div className="pr-5">
        <p className="text-xs font-semibold text-text-tertiary mb-1 uppercase tracking-wide">
          {insight.type === 'warning' ? 'Инайт дня' : insight.type === 'forecast' ? 'Прогноз' : insight.type === 'success' ? 'Результат' : 'Совет'}
        </p>
        <p className={`font-bold text-base ${c.text} mb-1`}>{insight.title}</p>
        <p className="text-sm text-text-secondary leading-snug">{insight.body}</p>
        <button
          onClick={() => ask(question)}
          className={`text-sm font-semibold ${c.text} mt-2 flex items-center gap-1`}
        >
          {insight.action ?? 'Что с этим делать?'} →
        </button>
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

// ─── Personal Plan block ───────────────────────────────────────────────────────

const parsePlanItems = (summary: string): string[] =>
  summary
    .split(/(?:\n|(?<=\.)\s+(?=[А-ЯA-Z🔹•\-\d]))/g)
    .map(s => s.replace(/^[\d\.\-•*]+\s*/, '').trim())
    .filter(s => s.length > 10 && s.length < 200)
    .slice(0, 5);

const STEP_COLORS = ['text-primary', 'text-success', 'text-purple', 'text-warning', 'text-success'];

const PersonalPlanBlock = ({ summary }: { summary: string }) => {
  const ask = useAskAi();
  const [expanded, setExpanded] = useState(false);
  const items = parsePlanItems(summary);
  const shown = expanded ? items : items.slice(0, 3);

  return (
    <Card variant="default" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-base shadow-primary">📋</span>
          <h2 className="text-base font-bold text-text-primary">Мой план</h2>
        </div>
        <Badge variant="primary">AI</Badge>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {shown.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 border-current ${STEP_COLORS[i % STEP_COLORS.length]}`}>
                {i + 1}
              </span>
              <p className="text-sm text-text-secondary leading-snug pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{summary}</p>
      )}

      {items.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-3 text-sm font-semibold text-primary flex items-center gap-1">
          {expanded ? 'Свернуть' : `Ещё ${items.length - 3} шага`}
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-border-light">
        <AskAiButton
          variant="chip"
          question={`Вот мой персональный финансовый план: «${summary.slice(0, 300)}». Помоги детально разобрать каждый шаг и приоритизировать, что делать прямо сейчас.`}
          label="Разобрать план с AI"
        />
      </div>
    </Card>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const user = useUserStore(s => s.user);
  const { profile, fetchProfile } = useFinanceStore();
  const { txs: userTx, addTx } = useUserTxStore();
  const [visibleInsights, setVisibleInsights] = useState(profile.insights);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allTx = useMemo<Transaction[]>(() => [...userTx, ...MOCK_TRANSACTIONS], [userTx]);
  const isToday = selectedDay.toDateString() === new Date().toDateString();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    setVisibleInsights(profile.insights);
  }, [profile.insights]);

  const dismissInsight = (id: string) =>
    setVisibleInsights(prev => prev.filter(i => i.id !== id));

  const firstName = user?.name.split(' ')[0] ?? 'Гость';

  return (
    <>
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
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#1C1C1E" strokeWidth="1.8" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* ── Week strip ── */}
        <motion.div variants={item} className="px-5 mb-4">
          <Card variant="default" padding="md">
            <WeekStrip selected={selectedDay} onSelect={setSelectedDay} />
            {!isToday && (
              <p className="text-[11px] text-text-tertiary text-center mt-2.5">Сводка за выбранный день ниже · нажми «Сегодня» для обзора</p>
            )}
          </Card>
        </motion.div>

        {isToday && (<>
          {/* ── Home hero (только сегодня) ── */}
          <HomeHero />

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

              {/* AI-вывод из расходов + вопрос */}
              {(() => {
                const over = profile.categories.find(c => c.amount > c.budget);
                const top = [...profile.categories].sort((a, b) => b.amount - a.amount)[0];
                const text = over
                  ? `Категория «${over.label}» вышла за бюджет на ${formatCurrency(over.amount - over.budget, true)}.`
                  : `Больше всего уходит на «${top.label}» — ${formatCurrency(top.amount, true)} за месяц.`;
                const question = over
                  ? `Категория «${over.label}» превысила бюджет. Как мне сократить эти траты?`
                  : `Больше всего я трачу на «${top.label}». Это нормально и где можно сэкономить?`;
                return (
                  <div className="mt-4 pt-4 border-t border-border-light flex items-center justify-between gap-3">
                    <p className="text-xs text-text-secondary leading-snug flex-1">🤖 {text}</p>
                    <AskAiButton question={question} label="Разобрать" className="flex-shrink-0" />
                  </div>
                );
              })()}
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

        </>)}

        {!isToday && <DayDetail date={selectedDay} txs={allTx} />}

        {/* ── Персональный план (только сегодня, если есть summary) ── */}
        {isToday && user?.profileSummary && (
          <motion.div variants={item} className="px-5 mb-6">
            <PersonalPlanBlock summary={user.profileSummary} />
          </motion.div>
        )}
      </motion.div>

      {/* ── FAB: добавить операцию ── */}
      <div className="fixed inset-x-0 bottom-24 z-40 pointer-events-none">
        <div className="max-w-mobile mx-auto px-5 flex justify-end">
          <button
            onClick={() => setAddOpen(true)}
            className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-primary text-white shadow-primary flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>

      <AddTransactionSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addTx}
        defaultDate={isToday ? undefined : selectedDay.toISOString()}
      />

      <AnalyticsModal />
    </>
  );
};
