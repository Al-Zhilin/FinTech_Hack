import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, CheckCircle2, Circle, ArrowRight, Lightbulb, Sparkles, RotateCcw } from 'lucide-react';
import catJump from '@/assets/copycat-jump.png';
import catAdvisor from '@/assets/mascot-advisor.png';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import { useCoachStore, type PlanStep } from '@/entities/coach/model/coachStore';
import { buildCoachContext } from '@/entities/coach/model/coachAdvice';

const URGENCY_COLORS = {
  critical: { ring: 'ring-danger',  dot: 'bg-danger',   badge: 'bg-danger text-white', glow: 'shadow-danger/30' },
  high:     { ring: 'ring-warning', dot: 'bg-warning',  badge: 'bg-warning text-white', glow: 'shadow-warning/30' },
  medium:   { ring: 'ring-primary', dot: 'bg-primary',  badge: 'bg-primary-light text-primary', glow: 'shadow-primary/20' },
  low:      { ring: 'ring-success', dot: 'bg-success',  badge: 'bg-success-light text-success', glow: 'shadow-card' },
};

const PRIORITY_COLORS: Record<PlanStep['priority'], string> = {
  high:   'text-danger',
  medium: 'text-warning',
  low:    'text-success',
};


// ── Intro screen ─────────────────────────────────────────────────────────────
function CoachIntro({ name, onStart }: { name: string; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-2 py-4 gap-4">
      <motion.div
        initial={{ scale: 0, rotate: -10, y: 20 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="relative"
      >
        <motion.img
          src={catJump}
          alt="КопиКот"
          className="w-32 h-32 object-contain drop-shadow-xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div>
        <h2 className="text-xl font-extrabold text-text-primary mb-1">Привет, {name}!</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Я твой личный финансовый наставник. Буду вести тебя шаг за шагом — как настоящий советник рядом.
        </p>
      </div>

      <div className="w-full flex flex-col gap-2 text-left">
        {[
          { icon: '🎯', text: 'Каждую неделю — конкретный план из 5–7 шагов' },
          { icon: '⚡', text: 'Главный приоритет всегда на виду — без раздумий' },
          { icon: '📊', text: 'Слежу за твоими финансами и предупреждаю заранее' },
          { icon: '🤝', text: 'Говорю прямо — что делать, сколько и когда' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3 bg-bg-muted rounded-xl px-3 py-2.5">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <p className="text-sm text-text-primary font-medium leading-snug">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-extrabold text-base shadow-primary active:scale-[0.98] transition-transform"
      >
        Начать — покажи мой план 🚀
      </button>
    </div>
  );
}

// ── Plan step row ─────────────────────────────────────────────────────────────
function StepRow({ step, done, onToggle, onNavigate }: {
  step: PlanStep;
  done: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-3 rounded-2xl transition-all ${
        done ? 'bg-success-light/60 opacity-70' : 'bg-bg-muted'
      }`}
    >
      <button onClick={onToggle} className="flex-shrink-0 mt-0.5">
        {done
          ? <CheckCircle2 size={22} className="text-success" />
          : <Circle size={22} className={PRIORITY_COLORS[step.priority]} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-snug ${done ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
          {step.icon} {step.text}
        </p>
        {step.detail && !done && (
          <p className="text-[11px] text-text-secondary leading-snug mt-0.5">{step.detail}</p>
        )}
      </div>

      {step.route && !done && (
        <button
          onClick={onNavigate}
          className="flex-shrink-0 flex items-center gap-0.5 text-xs font-bold text-primary bg-primary-light px-2 py-1 rounded-full"
        >
          {step.action ?? 'Перейти'} <ChevronRight size={11} />
        </button>
      )}
    </motion.div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export const PersonalCoach = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<'plan' | 'tip'>('plan');
  const navigate        = useNavigate();
  const location        = useLocation();

  const user         = useUserStore(s => s.user);
  const { profile }  = useFinanceStore();
  const txCount      = useUserTxStore(s => s.txs.length);
  const arenaStreak  = useArenaStore(s => s.streak);
  const arenaCoins   = useArenaStore(s => s.coins);

  const { doneSteps, seenIntro, markDone, markUndone, seeIntro, resetWeek } = useCoachStore();

  // useMemo ДОЛЖЕН быть до любого раннего return — правило хуков
  const ctx = useMemo(
    () => buildCoachContext(user, profile, arenaStreak, arenaCoins, txCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.income, user?.monthlyExpenses, profile.stressScore, arenaStreak, txCount],
  );

  // Показываем только на дашборде — ПОСЛЕ всех хуков
  if (location.pathname !== '/dashboard' || !user) return null;

  const urgencyStyle = URGENCY_COLORS[ctx.urgency];
  const totalSteps   = ctx.steps.length;
  const doneCount    = ctx.steps.filter(s => doneSteps.includes(s.id)).length;
  const pct          = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

  const handleNavigate = (step: PlanStep) => {
    if (step.route) {
      markDone(step.id);
      setOpen(false);
      navigate(step.route);
    }
  };

  const name = user.name.split(' ')[0];

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-20 right-4 z-[300]">
        <AnimatePresence>
          {!open && (
            <motion.button
              key="fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setOpen(true)}
              className={`relative w-16 h-16 rounded-2xl shadow-lg ${urgencyStyle.glow} flex items-center justify-center overflow-visible bg-transparent`}
            >
              <motion.img
                src={catJump}
                alt="КопиКот"
                className="w-16 h-16 object-contain drop-shadow-lg"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Бейдж прогресса */}
              {seenIntro && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full bg-white border-2 border-primary flex items-center justify-center text-[10px] font-extrabold text-primary px-1 shadow-sm">
                  {doneCount}/{totalSteps}
                </span>
              )}

              {/* Пульсирующая точка для critical/high */}
              {(ctx.urgency === 'critical' || ctx.urgency === 'high') && !seenIntro && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-danger animate-ping" />
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom sheet ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[350] flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full max-w-mobile bg-white rounded-t-3xl shadow-lg overflow-hidden"
              style={{ maxHeight: '90dvh' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* ── Шапка ── */}
              <div className="flex items-center justify-between px-5 pt-3 pb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={catAdvisor}
                    alt="КопиКот"
                    className="w-12 h-12 object-contain drop-shadow-md flex-shrink-0"
                  />
                  <div>
                    <p className="font-extrabold text-text-primary leading-tight">КопиКот · Наставник</p>
                    <p className="text-[11px] text-text-tertiary">Веду тебя шаг за шагом 🐾</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary">
                  <X size={16} />
                </button>
              </div>

              {/* Контент */}
              <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(90dvh - 100px)' }}>
                {!seenIntro ? (
                  <CoachIntro name={name} onStart={() => { seeIntro(); setTab('plan'); }} />
                ) : (
                  <>
                    {/* Вкладки */}
                    <div className="flex gap-1.5 p-1 bg-bg-muted rounded-xl mb-4">
                      {([['plan', '📋 Мой план', totalSteps], ['tip', '💡 Совет']] as const).map(([key, label, cnt]) => (
                        <button key={key} onClick={() => setTab(key)}
                          className={`flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-bold transition-all ${
                            tab === key ? 'bg-white shadow-card text-text-primary' : 'text-text-tertiary'
                          }`}>
                          {label}
                          {cnt !== undefined && tab !== key && (
                            <span className="ml-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-black">
                              {cnt}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* ── ПЛАН ── */}
                    {tab === 'plan' && (
                      <div className="flex flex-col gap-3">
                        {/* Приоритет недели */}
                        <div className={`rounded-2xl p-4 bg-gradient-to-br ${
                          ctx.urgency === 'critical' ? 'from-danger-light to-danger/5' :
                          ctx.urgency === 'high'     ? 'from-warning-light to-warning/5' :
                                                       'from-primary-light to-purple/5'
                        } border ${
                          ctx.urgency === 'critical' ? 'border-danger/20' :
                          ctx.urgency === 'high'     ? 'border-warning/20' :
                                                       'border-primary/15'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={14} className={
                              ctx.urgency === 'critical' ? 'text-danger' :
                              ctx.urgency === 'high'     ? 'text-warning' : 'text-primary'
                            } />
                            <span className="text-xs font-extrabold uppercase tracking-wide text-text-tertiary">
                              {ctx.priorityLabel}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-text-primary leading-snug mb-3">
                            {ctx.observation}
                          </p>
                          {ctx.priorityStep && (
                            <button
                              onClick={() => handleNavigate(ctx.priorityStep)}
                              className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${
                                ctx.urgency === 'critical' ? 'bg-danger text-white' :
                                ctx.urgency === 'high'     ? 'bg-warning text-white' :
                                                             'bg-gradient-primary text-white shadow-primary'
                              }`}
                            >
                              {ctx.priorityStep.icon} {ctx.priorityStep.action ?? 'Сделать'}
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </div>

                        {/* Прогресс плана */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-bold text-text-primary">
                              Прогресс недели — {doneCount} из {totalSteps}
                            </p>
                            <button onClick={resetWeek} className="flex items-center gap-1 text-[10px] text-text-tertiary">
                              <RotateCcw size={10} /> сбросить
                            </button>
                          </div>
                          <div className="w-full h-2 bg-bg-muted rounded-full overflow-hidden mb-4">
                            <motion.div
                              className="h-full bg-gradient-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        {/* Шаги плана — сначала незавершённые */}
                        <div className="flex flex-col gap-2">
                          {ctx.steps
                            .sort((a, b) => {
                              const ad = doneSteps.includes(a.id) ? 1 : 0;
                              const bd = doneSteps.includes(b.id) ? 1 : 0;
                              return ad - bd;
                            })
                            .map(step => (
                              <StepRow
                                key={step.id}
                                step={step}
                                done={doneSteps.includes(step.id)}
                                onToggle={() =>
                                  doneSteps.includes(step.id)
                                    ? markUndone(step.id)
                                    : markDone(step.id)
                                }
                                onNavigate={() => handleNavigate(step)}
                              />
                            ))}
                        </div>

                        {/* Сделал всё! */}
                        {doneCount === totalSteps && totalSteps > 0 && (
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center py-4 bg-success-light rounded-2xl"
                          >
                            <p className="text-2xl mb-1">🏆</p>
                            <p className="font-extrabold text-success">Всё выполнено!</p>
                            <p className="text-xs text-text-secondary">Ты молодец, {name}. Обновлю план на следующей неделе</p>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* ── СОВЕТ ── */}
                    {tab === 'tip' && (
                      <div className="flex flex-col gap-3">
                        {/* Контекстуальный совет */}
                        <div className="bg-primary-light rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb size={16} className="text-primary" />
                            <span className="text-xs font-extrabold text-primary uppercase tracking-wide">Совет для тебя</span>
                          </div>
                          <p className="text-sm font-semibold text-text-primary leading-relaxed">{ctx.tip}</p>
                        </div>

                        {/* Быстрые действия по разделам */}
                        <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide">Куда зайти прямо сейчас</p>
                        {[
                          { icon: '📊', label: 'Посмотреть расходы', route: '/finance', desc: 'Категории и динамика трат' },
                          { icon: '🎯', label: 'Проверить цели', route: '/goals', desc: 'Прогресс накоплений' },
                          { icon: '🏦', label: 'Кредитный калькулятор', route: '/analytics', desc: 'Рассчитать условия под тебя' },
                          { icon: '🐾', label: 'К КопиКоту', route: '/arena', desc: 'Квиз дня и монеты' },
                        ].map(({ icon, label, route, desc }) => (
                          <button
                            key={route}
                            onClick={() => { setOpen(false); navigate(route); }}
                            className="flex items-center gap-3 bg-bg-muted rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-transform"
                          >
                            <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-card flex-shrink-0">{icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm text-text-primary">{label}</p>
                              <p className="text-[11px] text-text-secondary">{desc}</p>
                            </div>
                            <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
