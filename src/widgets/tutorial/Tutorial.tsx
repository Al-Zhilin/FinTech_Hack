import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SkipForward, ArrowRight } from 'lucide-react';
import { useTutorialStore, TUTORIAL_STEPS } from './TutorialStore';
import { useUserStore } from '@/entities/user/model/userStore';
import catJump    from '@/assets/copycat-jump.png';
import catAdvisor from '@/assets/mascot-advisor.png';

// ── Dot progress ───────────────────────────────────────────────────────────────
const Dots = ({ total, cur }: { total: number; cur: number }) => (
  <div className="flex items-center justify-center gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <motion.span
        key={i}
        animate={{ width: i === cur ? 20 : 6, opacity: i <= cur ? 1 : 0.3 }}
        transition={{ duration: 0.22 }}
        className={`h-1.5 rounded-full inline-block ${i === cur ? 'bg-primary' : 'bg-border'}`}
      />
    ))}
  </div>
);

// ── Route chip ─────────────────────────────────────────────────────────────────
const ROUTE_META: Record<string, { icon: string; label: string }> = {
  '/dashboard': { icon: '🏠', label: 'Главная'  },
  '/finance':   { icon: '💰', label: 'Финансы'  },
  '/chat':      { icon: '🤖', label: 'AI-чат'   },
  '/arena':     { icon: '🐾', label: 'Арена'    },
};

// ── Spotlight hook: tracks DOM rect of the target element ─────────────────────
function useSpotlight(targetId: string | undefined, stepIdx: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!targetId) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector(`[data-tutorial-target="${targetId}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // after scroll settles
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      }, 350);
    };

    // small initial delay so the route renders first
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(measure, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [targetId, stepIdx]);

  // also update on window resize
  useEffect(() => {
    const onResize = () => {
      if (!targetId) return;
      const el = document.querySelector(`[data-tutorial-target="${targetId}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [targetId]);

  return rect;
}

// ── Spotlight overlay ──────────────────────────────────────────────────────────
const PAD = 10;
const RADIUS = 16;

function Spotlight({ rect }: { rect: DOMRect }) {
  const x = rect.left - PAD;
  const y = rect.top  - PAD;
  const w = rect.width  + PAD * 2;
  const h = rect.height + PAD * 2;
  const uid = `spot-${Math.round(rect.left)}-${Math.round(rect.top)}`;

  return (
    <>
      {/* Dimming mask with cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <mask id={uid}>
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={RADIUS} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.68)" mask={`url(#${uid})`} />
      </svg>

      {/* Pulsing border around target */}
      <motion.div
        className="absolute pointer-events-none rounded-2xl"
        style={{ left: x, top: y, width: w, height: h }}
        animate={{
          boxShadow: [
            '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 6px rgba(255,255,255,0)',
            '0 0 0 2px rgba(255,255,255,0.9), 0 0 24px 8px rgba(255,255,255,0.18)',
            '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 6px rgba(255,255,255,0)',
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Corner arrows pointing to the element */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ left: x + w / 2 - 10, top: y - 28, width: 20 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 20 16" fill="none">
          <path d="M10 0 L18 14 L2 14 Z" fill="white" opacity="0.85" />
        </svg>
      </motion.div>
    </>
  );
}

// ── Main Tutorial component ────────────────────────────────────────────────────
export const Tutorial = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isAuth    = useUserStore(s => s.isAuthenticated);
  const { active, done, stepIdx, next, skip, start } = useTutorialStore();

  const step    = TUTORIAL_STEPS[stepIdx];
  const total   = TUTORIAL_STEPS.length;
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === total - 1;

  // Auto-start for first-time users
  useEffect(() => {
    if (isAuth && !done && !active) start();
  }, [isAuth]); // eslint-disable-line

  // Navigate to step's route when step changes
  useEffect(() => {
    if (!active || !step) return;
    if (location.pathname !== step.route) navigate(step.route, { replace: false });
  }, [active, step?.route, stepIdx]); // eslint-disable-line

  const spotRect = useSpotlight(step?.target, stepIdx);
  const isCenter = step?.position === 'center' || !step?.position || isFirst || isLast;
  const routeMeta = ROUTE_META[step?.route ?? ''];

  // For bottom-positioned steps, put tooltip above spotlight if spotlight is low
  const cardAtTop = !isCenter && spotRect ? spotRect.top > window.innerHeight * 0.55 : false;

  const handleNext = useCallback(() => next(), [next]);
  const handleSkip = useCallback(() => skip(), [skip]);

  if (!active || !step) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className="fixed inset-0 z-[600] pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Base backdrop (only shown when no spotlight) */}
        {!spotRect && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        )}

        {/* Spotlight SVG + pulsing border */}
        {spotRect && <Spotlight rect={spotRect} />}

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-purple to-warning"
            animate={{ width: `${((stepIdx + 1) / total) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* ── Tooltip card ── */}
        <div className={`absolute inset-x-0 z-10 flex justify-center px-4 ${
          isCenter
            ? 'top-1/2 -translate-y-1/2'
            : cardAtTop
              ? 'top-14'
              : 'bottom-24'
        }`}>
          <motion.div
            key={`card-${step.id}`}
            initial={{ opacity: 0, y: isCenter ? 20 : cardAtTop ? -20 : 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-[360px] bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.28)] overflow-hidden"
          >
            {/* Header with mascot + speech bubble */}
            <div className="relative bg-gradient-to-br from-primary-light via-bg-base to-warning-light px-5 pt-5 pb-4">
              <button
                onClick={handleSkip}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-text-secondary hover:bg-white transition-colors"
                aria-label="Пропустить тур"
              >
                <X size={14} />
              </button>

              <div className="flex items-end gap-3">
                {/* KopiKot mascot — PNG */}
                <motion.div
                  key={step.id + '-kot'}
                  initial={{ scale: 0.7, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 22, delay: 0.06 }}
                  className="flex-shrink-0"
                >
                  <motion.img
                    src={isFirst || isLast ? catJump : catAdvisor}
                    alt="КопиКот"
                    width={72}
                    height={72}
                    className="object-contain drop-shadow-lg"
                    animate={isFirst || isLast
                      ? { y: [0, -7, 0], rotate: [0, 4, -4, 0] }
                      : { rotate: [0, -3, 3, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>

                {/* Speech bubble */}
                <div className="flex-1 min-w-0 relative mb-1">
                  {/* Bubble tail */}
                  <div className="absolute -left-2 bottom-4 w-0 h-0
                    border-t-[7px] border-t-transparent
                    border-r-[9px] border-r-white
                    border-b-[7px] border-b-transparent" />
                  <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm">
                    {/* Route chip */}
                    {routeMeta && !isFirst && !isLast && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary-light rounded-full px-2 py-0.5 mb-1.5">
                        {routeMeta.icon} {routeMeta.label}
                      </span>
                    )}
                    <div className="flex items-start gap-1.5">
                      <motion.span
                        key={`emoji-${step.id}`}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.12 }}
                        className="text-xl flex-shrink-0 leading-tight"
                      >
                        {step.emoji}
                      </motion.span>
                      <h2 className="text-sm font-extrabold text-text-primary leading-tight">
                        {step.title}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-3 pb-5">
              <motion.p
                key={`body-${step.id}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="text-sm text-text-secondary leading-relaxed mb-4"
              >
                {step.body}
              </motion.p>

              <Dots total={total} cur={stepIdx} />

              <div className="flex gap-2 mt-4">
                {!isFirst && !isLast && (
                  <button
                    onClick={handleSkip}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-text-tertiary bg-bg-muted hover:bg-border-light transition-colors"
                  >
                    <SkipForward size={13} /> Пропустить
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-gradient-primary text-white shadow-primary active:scale-[0.97] transition-transform"
                >
                  {step.action ?? 'Дальше'}
                  {!isLast && <ArrowRight size={15} />}
                </button>
              </div>

              <p className="text-center text-[11px] text-text-tertiary mt-2.5">
                {stepIdx + 1} из {total}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
