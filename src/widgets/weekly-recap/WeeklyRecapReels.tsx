import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { MOCK_TRANSACTIONS } from '@/entities/finance/model/transactions';
import { buildWeeklyRecaps, buildRecapStory, type RecapBlock } from '@/entities/profile/model/weeklyRecap';
import { useAskAi } from '@/features/ask-ai';

const BG = '#F19B8C';
const SWIPE_THRESHOLD = 90;
const VELOCITY_THRESHOLD = 400;

// Для демо жюри: показываем при каждом запуске сайта (один раз за загрузку страницы).
const SESSION_KEY = 'ekvator_recap_seen_session';

const BlockView = ({ block, index, total }: { block: RecapBlock; index: number; total: number }) => (
  <div className="h-full w-full flex flex-col items-center px-7 pt-24 pb-28 text-white">
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
      className="relative flex items-center justify-center mb-8"
    >
      <div className="absolute w-44 h-44 rounded-full bg-white/15 blur-xl" />
      <div className="relative w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
        <span className="text-6xl drop-shadow-lg">{block.emoji}</span>
      </div>
    </motion.div>

    <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-2">
      {block.tag} · {index + 1}/{total}
    </motion.p>
    <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="text-[28px] font-bold text-center leading-tight mb-5">
      {block.title}
    </motion.h2>

    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="w-full bg-white/15 backdrop-blur-md rounded-3xl px-5 py-5 text-center mt-auto">
      <p className="text-white text-[17px] leading-relaxed">{block.text}</p>
    </motion.div>
  </div>
);

export const WeeklyRecapReels = () => {
  const user = useUserStore(s => s.user);
  const { txs: userTx } = useUserTxStore();
  const ask = useAskAi();

  const story = useMemo(() => {
    const recaps = buildWeeklyRecaps([...userTx, ...MOCK_TRANSACTIONS], 1);
    return buildRecapStory(recaps[0], user?.name);
  }, [userTx, user?.name]);

  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const total = story.blocks.length;

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(SESSION_KEY)) return; // уже показывали в этот запуск
    sessionStorage.setItem(SESSION_KEY, '1');
    const id = setTimeout(() => {
      setVisible(true);
      // «push»-хук — лёгкое нативное уведомление, если уже разрешено
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Твоя финансовая неделя', { body: story.hook });
        }
      } catch { /* noop */ }
    }, 600);
    return () => clearTimeout(id);
  }, [user, story.hook]);

  const close = () => { setVisible(false); setIndex(0); };
  const next = () => { if (index < total - 1) setIndex(i => i + 1); else close(); };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SWIPE_THRESHOLD || info.velocity.y > VELOCITY_THRESHOLD) next();
  };

  const block = story.blocks[index];
  const isLast = index === total - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] overflow-hidden"
          style={{ backgroundColor: BG, maxWidth: 430, margin: '0 auto' }}
        >
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-black/5 blur-3xl pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-5 pt-12">
            <div className="flex-1 flex gap-1.5">
              {story.blocks.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                  <motion.div className="h-full bg-white rounded-full" initial={false}
                    animate={{ width: i <= index ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
                </div>
              ))}
            </div>
            <button onClick={close}
              className="w-8 h-8 -mt-0.5 rounded-full bg-white/20 flex items-center justify-center text-white text-xl leading-none backdrop-blur-sm active:scale-90 transition-transform">
              ×
            </button>
          </div>

          {/* Slides */}
          <motion.div
            className="absolute inset-0 z-10 touch-none cursor-grab active:cursor-grabbing"
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.5} onDragEnd={onDragEnd}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={index}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="absolute inset-0">
                <BlockView block={block} index={index} total={total} />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Bottom: CTA on last block, hint otherwise */}
          <div className="absolute bottom-0 inset-x-0 z-20 px-7 pb-8">
            {isLast && block.askPrompt ? (
              <button
                onClick={() => { const p = block.askPrompt!; close(); ask(p); }}
                className="w-full h-12 rounded-2xl bg-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                style={{ color: BG }}
              >
                <Sparkles size={16} />
                <span>Разобрать с AI</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <motion.div className="flex flex-col items-center gap-1 pointer-events-none"
                animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
                <span className="text-white/70 text-2xl leading-none">⌄</span>
                <span className="text-white/70 text-xs font-medium">Листай вниз</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
