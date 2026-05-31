import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, TrendingUp, Users, Sparkles, Plus } from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useUserGoalsStore } from '@/entities/goal/model/userGoalsStore';
import { analyzeGoal, getPeerStories, type GoalStatus } from '@/entities/goal/model/goalAnalysis';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { AskAiButton } from '@/features/ask-ai';
import { InsightFeed } from '@/widgets/insight-feed/InsightFeed';
import { formatCurrency } from '@/shared/lib/formatters';
import type { Goal } from '@/shared/types';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '🚀', '🌴', '💍', '🎓', '📱', '💻', '🛡️', '🏝️'];
const GOAL_COLORS = ['#E8856A', '#B87EFF', '#34C759', '#4ECDC4', '#FF6B6B', '#FFB02E'];

const STATUS_CFG: Record<GoalStatus, { label: string; cls: string }> = {
  done:     { label: 'Готово',      cls: 'bg-primary-light text-primary' },
  on_track: { label: 'В графике',   cls: 'bg-success-light text-success' },
  tight:    { label: 'Напряжённо',  cls: 'bg-warning-light text-warning' },
  hard:     { label: 'Не успеваем', cls: 'bg-danger-light text-danger' },
};

export const GoalsPage = () => {
  const user = useUserStore(s => s.user);
  const { profile } = useFinanceStore();
  const { goals: userGoals, addGoal, removeGoal, topUp } = useUserGoalsStore();

  const finance = {
    income: user?.income ?? profile.monthlyIncome,
    expenses: user?.monthlyExpenses ?? profile.monthlySpent,
  };

  // Цели пользователя идут первыми, затем демонстрационные
  const allGoals = useMemo<Goal[]>(
    () => [...userGoals, ...profile.goals],
    [userGoals, profile.goals],
  );

  const [detail, setDetail] = useState<Goal | null>(null);
  const [adding, setAdding] = useState(false);

  // ── Форма новой цели ──
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState(GOAL_ICONS[0]);

  const canCreate = title.trim().length >= 2 && Number(target) > 0 && !!deadline;

  const resetForm = () => {
    setTitle(''); setTarget(''); setDeadline(''); setIcon(GOAL_ICONS[0]);
  };

  const submit = () => {
    if (!canCreate) return;
    addGoal({
      title: title.trim(),
      target: Number(target),
      deadline,
      icon,
      color: GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)],
    });
    resetForm();
    setAdding(false);
  };

  const isUserGoal = (id: string) => userGoals.some(g => g.id === id);

  return (
    <motion.div className="flex flex-col bg-bg-base min-h-dvh px-5 pt-12 md:pt-6 pb-6"
      variants={container} initial="hidden" animate="show">

      <motion.div variants={item} className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Мои цели</h1>
          <p className="text-text-secondary text-sm mt-1">Создавай цели — посчитаю план под твои финансы</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="w-11 h-11 rounded-xl bg-gradient-primary text-white flex items-center justify-center shadow-primary flex-shrink-0 active:scale-95 transition-transform"
        >
          <Plus size={22} />
        </button>
      </motion.div>

      <div className="flex flex-col gap-4">
        {allGoals.map(goal => {
          const a = analyzeGoal(goal, finance);
          const cfg = STATUS_CFG[a.status];
          return (
            <motion.div key={goal.id} variants={item}>
              <Card variant="default" padding="lg" pressable onClick={() => setDetail(goal)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                         style={{ backgroundColor: goal.color + '18' }}>
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">{goal.title}</h3>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Осталось {formatCurrency(a.remaining, true)} · {a.monthsLeft} мес.
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                </div>

                <div className="mb-2">
                  <ProgressBar value={a.pct} color="primary" size="md" />
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-text-secondary font-medium">{formatCurrency(goal.current)}</span>
                  <span className="text-text-tertiary">{formatCurrency(goal.target)}</span>
                </div>

                {/* Вывод от приложения */}
                <div className="flex items-start gap-2 bg-bg-muted rounded-xl px-3 py-2.5">
                  <TrendingUp size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-text-secondary leading-snug">
                    {a.status === 'done'
                      ? 'Цель достигнута! 🎉'
                      : <>Чтобы успеть к сроку — откладывай <span className="font-bold text-text-primary">{formatCurrency(a.requiredMonthly, true)}/мес</span>. Нажми, чтобы увидеть план.</>}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={item} className="mt-6">
        <button
          onClick={() => setAdding(true)}
          className="w-full h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-text-tertiary font-medium hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={20} />
          Добавить цель
        </button>
      </motion.div>

      {/* AI-блоки с вопросами по накоплению */}
      <motion.div variants={item} className="mt-8">
        <InsightFeed limit={3} title="Как копить быстрее" />
      </motion.div>

      {/* ── Детали цели: план + опыт других ── */}
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (() => {
          const a = analyzeGoal(detail, finance);
          const peers = getPeerStories(detail);
          return (
            <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto -mx-1 px-1">
              {/* Сводка */}
              <div className="rounded-2xl p-4 bg-gradient-card-pink border border-primary/15">
                <p className="text-sm text-text-primary font-semibold mb-3">{a.headline}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-xs text-text-tertiary">Осталось накопить</p>
                    <p className="font-bold text-text-primary">{formatCurrency(a.remaining)}</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-xs text-text-tertiary">До срока</p>
                    <p className="font-bold text-text-primary">{a.monthsLeft} мес.</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-xs text-text-tertiary">Нужно в месяц</p>
                    <p className="font-bold text-text-primary">{formatCurrency(a.requiredMonthly, true)}</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3">
                    <p className="text-xs text-text-tertiary">Свободно в месяц</p>
                    <p className="font-bold text-text-primary">{formatCurrency(a.freeCash, true)}</p>
                  </div>
                </div>
                {a.etaDate && a.status !== 'done' && (
                  <p className="text-xs text-text-secondary mt-3">
                    При текущем темпе ({formatCurrency(a.freeCash, true)}/мес) цель закроется к <span className="font-semibold">{a.etaDate}</span>.
                  </p>
                )}
              </div>

              {/* План достижения */}
              {a.plan.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">План достижения</p>
                  <div className="flex flex-col gap-2">
                    {a.plan.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <p className="text-sm text-text-secondary leading-snug pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Опыт других людей */}
              <div>
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Users size={13} /> Опыт людей с похожей целью
                </p>
                <div className="flex flex-col gap-2.5">
                  {peers.map((p, i) => (
                    <div key={i} className="flex gap-3 bg-bg-muted rounded-xl p-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                           style={{ backgroundColor: p.color }}>
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          {p.name}, {p.age} · <span className="text-text-tertiary font-normal">{p.goal}</span>
                        </p>
                        <p className="text-xs text-text-secondary leading-snug mt-0.5">{p.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Действия */}
              <div className="flex flex-col gap-2">
                <AskAiButton
                  variant="solid"
                  question={`Моя цель «${detail.title}»: накоплено ${detail.current} ₽ из ${detail.target} ₽, срок до ${detail.deadline}. Составь подробный пошаговый план, как мне её достичь с учётом моих доходов и расходов.`}
                  label="Собрать детальный план с AI"
                />
                {isUserGoal(detail.id) && (
                  <div className="flex gap-2">
                    <Button variant="secondary" fullWidth onClick={() => topUp(detail.id, Math.max(1000, a.recommendedMonthly))}>
                      <Sparkles size={16} className="mr-1.5" />
                      Пополнить на {formatCurrency(Math.max(1000, a.recommendedMonthly), true)}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => { removeGoal(detail.id); setDetail(null); }}
                      className="!px-4 flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      {/* ── Форма новой цели ── */}
      <BottomSheet open={adding} onClose={() => setAdding(false)} title="Новая цель">
        <div className="flex flex-col gap-4">
          <Input
            label="Название цели"
            placeholder="Например, Отпуск в Японии"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Input
            label="Сколько нужно накопить"
            placeholder="300000"
            type="number"
            inputMode="numeric"
            suffix={<span className="text-sm font-medium">₽</span>}
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
          <Input
            label="К какому сроку"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Иконка</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === ic ? 'bg-primary-light ring-2 ring-primary' : 'bg-bg-muted'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Превью расчёта */}
          {canCreate && (() => {
            const preview = analyzeGoal(
              { id: 'preview', title, target: Number(target), current: 0, deadline, icon, color: '#E8856A' },
              finance,
            );
            return (
              <div className="bg-bg-muted rounded-xl px-4 py-3 flex items-start gap-2">
                <TrendingUp size={15} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-snug">
                  Чтобы успеть к сроку, нужно откладывать <span className="font-bold text-text-primary">{formatCurrency(preview.requiredMonthly, true)}/мес</span>
                  {' '}— это {preview.sharePct > 100 ? 'больше' : `${preview.sharePct}%`} от свободных {formatCurrency(preview.freeCash, true)}.
                </p>
              </div>
            );
          })()}

          <Button size="lg" fullWidth onClick={submit} disabled={!canCreate}>
            Создать цель
          </Button>
        </div>
      </BottomSheet>
    </motion.div>
  );
};
