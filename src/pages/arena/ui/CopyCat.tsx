import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import { getCatState, getRandomPhrase, findShopItem } from '@/entities/arena/model/copyCat';
import type { CatPhrase } from '@/entities/arena/model/copyCat';
import catJump    from '@/assets/copycat-jump.png';
import catAdvisor from '@/assets/mascot-advisor.png';

type PhraseType = 'wisdom' | 'reminder' | 'meow';
const PHRASE_TAG: Record<PhraseType, { tag: string; color: string }> = {
  wisdom:   { tag: '💡 Мудрость',    color: '#6C5CE7' },
  reminder: { tag: '⏰ Напоминание', color: '#F59E0B' },
  meow:     { tag: '🐾 КопиКот',     color: '#00B894' },
};

// ── Конфетти при праздновании ─────────────────────────────────────────────────
const PARTY = Array.from({ length: 16 }, (_, i) => ({
  id: i, emoji: ['🪙','⭐','✨','💰','🎊','🎉','💫','🏅'][i % 8],
  x: ((i * 23 + (i % 4) * 40) % 270) - 15,
  delay: (i % 5) * 0.11, dur: 1.3 + (i % 4) * 0.28,
  rot: (i % 2 === 0 ? 1 : -1) * (80 + i * 17),
}));
function Confetti({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTY.map(p => (
            <motion.span key={p.id} className="absolute text-xl select-none"
              style={{ left: p.x, top: -24 }}
              initial={{ y: -24, opacity: 1, rotate: 0 }}
              animate={{ y: 340, opacity: [1, 1, 0.4, 0], rotate: p.rot }}
              exit={{}}
              transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}>
              {p.emoji}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Искры при тапе ────────────────────────────────────────────────────────────
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
function TapSparks({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {SPARK_ANGLES.map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const tx  = Math.cos(rad) * 55;
            const ty  = Math.sin(rad) * 55;
            return (
              <motion.span key={deg} className="absolute text-base select-none"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: tx, y: ty, opacity: 0, scale: 0.4 }}
                exit={{}}
                transition={{ duration: 0.5, delay: i * 0.02, ease: 'easeOut' }}>
                {['✨','⭐','💫','🌟'][i % 4]}
              </motion.span>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

// ── PNG-котик с CSS-эффектами состояний ───────────────────────────────────────
function CatImage({ catState, belly }: { catState: string; belly: boolean }) {
  const festive  = catState === 'festive';
  const rich     = catState === 'rich';
  const sleeping = catState === 'sleeping';
  const sad      = catState === 'sad';
  const src = (festive || rich) ? catJump : catAdvisor;

  const cssFilter = sleeping ? 'grayscale(30%) brightness(0.86)'
    : sad               ? 'grayscale(55%) brightness(0.80) saturate(0.5)'
    : rich              ? 'brightness(1.14) saturate(1.25) drop-shadow(0 0 12px #FFD70088)'
    : 'drop-shadow(0 8px 18px rgba(0,0,0,0.20))';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img src={src} alt="КопиКот"
        className="w-full h-full object-contain select-none"
        style={{ filter: cssFilter, transform: belly ? 'scale(1.04)' : undefined,
                 transition: 'filter 0.5s, transform 0.3s' }}
        draggable={false}
      />
      {/* Слёзы при грусти */}
      {sad && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[{ l:'39%', top:'52%', d:0 }, { l:'59%', top:'52%', d:0.35 }].map((p,i) => (
            <motion.span key={i} className="absolute text-base"
              style={{ left: p.l, top: p.top }}
              animate={{ y:[0,32,0], opacity:[0,0.9,0] }}
              transition={{ duration:1.5, repeat:Infinity, delay:p.d, ease:'easeInOut' }}>
              💧
            </motion.span>
          ))}
        </div>
      )}
      {/* Сердечко при почёсывании живота */}
      {belly && (
        <motion.div className="absolute inset-0 flex items-center justify-end pb-8 pr-2 pointer-events-none"
          initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0 }}>
          <span className="text-4xl">💗</span>
        </motion.div>
      )}
    </div>
  );
}

// ── Слот-позиции аксессуаров для PNG ─────────────────────────────────────────
const SLOT_POS: Record<string, { top: string; left: string; size: number }> = {
  head: { top: '-2%',  left: '50%', size: 0.32 },
  face: { top: '28%',  left: '50%', size: 0.24 },
  neck: { top: '62%',  left: '50%', size: 0.22 },
  paw:  { top: '48%',  left: '80%', size: 0.20 },
  feet: { top: '82%',  left: '50%', size: 0.26 },
};

// ── Main interactive компонент ─────────────────────────────────────────────────
export interface CopyCatProps {
  size?: number;
  interactive?: boolean;
  festive?: boolean;
  onWakeUp?: () => void;
}

export const CopyCat = ({
  size = 230,
  interactive = true,
  festive: externalFestive = false,
  onWakeUp,
}: CopyCatProps) => {
  const coins    = useArenaStore(s => s.coins);
  const daysAway = useArenaStore(s => s.daysAway);
  const equipped = useArenaStore(s => s.equipped);

  const stateKey = externalFestive ? 'festive' : getCatState(coins, daysAway).key;
  const auraColor: Record<string, string> = {
    rich:'#FFD700', normal:'#B87EFF', hungry:'#FF8A65',
    sad:'#90A4AE', sleeping:'#7986CB', festive:'#FFD700',
  };

  const [bubble,   setBubble]   = useState<CatPhrase | null>(null);
  const [belly,    setBelly]    = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [sparking, setSparking] = useState(false);
  const controls = useAnimationControls();

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLong   = useRef(false);

  const isSleeping = stateKey === 'sleeping';
  const isSad      = stateKey === 'sad';
  const isRich     = stateKey === 'rich';
  const isHungry   = stateKey === 'hungry';
  const isFestive  = stateKey === 'festive';

  const say = useCallback((phrase: CatPhrase) => {
    setBubble(phrase);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBubble(null), 3500);
  }, []);

  useEffect(() => { setTapCount(0); }, [stateKey]);

  // Запуск анимации тапа
  const triggerTap = useCallback(async () => {
    setSparking(true);
    await controls.start({
      scale: [1, 1.22, 0.92, 1.08, 1],
      rotate: [0, -5, 4, -2, 0],
      transition: { duration: 0.5, ease: 'easeOut' },
    });
    setTimeout(() => setSparking(false), 500);
  }, [controls]);

  const handleTap = useCallback(() => {
    if (!interactive || didLong.current) { didLong.current = false; return; }
    if (isSad) {
      const next = tapCount + 1;
      setTapCount(next);
      if (next < 2) return;
    }
    if (isSleeping) {
      say({ type: 'meow', text: 'Ммм... проснулся. Соскучился по мне? 😴' });
      triggerTap();
      return;
    }
    say(getRandomPhrase());
    triggerTap();
  }, [interactive, isSad, isSleeping, tapCount, say, triggerTap]);

  const startPress = useCallback(() => {
    if (!interactive) return;
    didLong.current = false;
    longTimer.current = setTimeout(() => {
      didLong.current = true;
      setBelly(true);
      say({ type: 'meow', text: 'Мрррр... почеши животик 🐾' });
    }, 450);
  }, [interactive, say]);

  const endPress = useCallback(() => {
    if (longTimer.current) clearTimeout(longTimer.current);
    setBelly(false);
  }, []);

  // ── Idle анимация тела ────────────────────────────────────────────────────
  const idleAnimate = isFestive
    ? { y: [0, -30, 0, -18, 0], rotate: [0, -7, 7, -3, 0] }
    : isSleeping
    ? { rotate: 16, y: 10, scale: 0.97 }
    : isSad
    ? { y: [0, -3, 0], rotate: [0, -1, 1, 0] }
    : isHungry
    ? { y: [0, -5, 0], rotate: [0, -2, 0] }
    : isRich
    ? { y: [0, -14, 0], scale: [1, 1.03, 1] }
    : { y: [0, -10, 0] };

  const idleTransition = isFestive
    ? { duration: 0.6, repeat: 8, repeatType: 'loop' as const }
    : isSleeping
    ? { type: 'spring' as const, stiffness: 60, damping: 12 }
    : { duration: isSad ? 5 : isRich ? 2.2 : 3.4, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>

      {/* Confetti */}
      <Confetti active={isFestive} />

      {/* Speech bubble */}
      <AnimatePresence>
        {bubble && (
          <motion.div key={bubble.text}
            initial={{ opacity:0, y:8, scale:0.85 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, scale:0.85 }}
            transition={{ type:'spring', stiffness:380, damping:24 }}
            className="absolute z-20 max-w-[270px] rounded-2xl bg-white px-4 py-2.5 shadow-card border-2"
            style={{ borderColor: PHRASE_TAG[bubble.type as PhraseType]?.color ?? '#6C5CE7',
                     top:0, left:'50%', transform:'translateX(-50%) translateY(-105%)' }}>
            <p className="text-[11px] font-extrabold mb-0.5"
               style={{ color: PHRASE_TAG[bubble.type as PhraseType]?.color ?? '#6C5CE7' }}>
              {PHRASE_TAG[bubble.type as PhraseType]?.tag ?? '🐾'}
            </p>
            <p className="text-[13px] font-semibold leading-snug text-text-primary">{bubble.text}</p>
            <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 rotate-45"
              style={{ borderColor: PHRASE_TAG[bubble.type as PhraseType]?.color ?? '#6C5CE7' }}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Аура */}
      <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ width: size*0.78, height: size*0.78,
                 top:'18%', left:'50%', transform:'translateX(-50%)',
                 background: auraColor[stateKey] ?? '#B87EFF',
                 opacity: isSad || isSleeping ? 0.12 : 0.28 }}
        animate={{ scale:[1, 1.14, 1] }}
        transition={{ duration:3.6, repeat:Infinity, ease:'easeInOut' }}
      />

      {/* Тень-пульс под котом */}
      <motion.div className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{ bottom:'-2%', width: size*0.55, height: size*0.09,
                 background:'rgba(0,0,0,0.13)', filter:'blur(8px)' }}
        animate={{ scaleX:[1, 0.85, 1], opacity:[0.7, 0.4, 0.7] }}
        transition={{ duration:3.4, repeat:Infinity, ease:'easeInOut' }}
      />

      {/* Монеты у богатого */}
      {isRich && (
        <motion.div className="absolute left-1/2 -translate-x-1/2 text-3xl pointer-events-none"
          style={{ bottom: size*0.04 }}
          animate={{ y:[0,-6,0] }} transition={{ duration:2.2, repeat:Infinity }}>
          💰🪙💰
        </motion.div>
      )}

      {/* ZZZ */}
      {isSleeping && (
        <motion.div className="absolute font-black text-[#7986CB] pointer-events-none"
          style={{ top:'6%', right:'14%', fontSize: size*0.14 }}
          animate={{ opacity:[0,1,0], y:[0,-(size*0.28)], scale:[0.7,1.2,0.7] }}
          transition={{ duration:2.4, repeat:Infinity }}>
          Z z z
        </motion.div>
      )}

      {/* Первый тап грустного */}
      <AnimatePresence>
        {isSad && tapCount === 1 && (
          <motion.div initial={{ opacity:0, scale:0 }} animate={{ opacity:[0,1,0], scale:[0,1.3,0] }}
            exit={{}} transition={{ duration:1.4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none">
            ❓
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Тело котика ── */}
      <motion.div className="cursor-pointer w-full h-full"
        animate={controls}
        style={{ scaleX: isSad ? -1 : 1 }}
        onPointerDown={startPress} onPointerUp={endPress} onPointerLeave={endPress}
        onClick={handleTap}
      >
        {/* Idle float wrapper */}
        <motion.div className="w-full h-full"
          animate={idleAnimate}
          transition={idleTransition}
        >
          {/* Breathing scale */}
          <motion.div className="w-full h-full"
            animate={!isSleeping ? { scale:[1, 1.025, 1] } : {}}
            transition={{ duration:4.8, repeat:Infinity, ease:'easeInOut' }}
          >
            <CatImage catState={stateKey} belly={belly} />

            {/* Аксессуары */}
            {equipped.map(id => {
              const item = findShopItem(id);
              if (!item?.slot) return null;
              const pos = SLOT_POS[item.slot];
              if (!pos) return null;
              return (
                <motion.span key={id}
                  className="absolute -translate-x-1/2 pointer-events-none drop-shadow-md"
                  style={{ top: pos.top, left: pos.left, fontSize: size * pos.size }}
                  initial={{ scale:0, rotate: -15 }}
                  animate={{ scale:1, rotate:0 }}
                  transition={{ type:'spring', stiffness:360, damping:18 }}>
                  {item.emoji}
                </motion.span>
              );
            })}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Искры тапа */}
      <TapSparks active={sparking} />

      {/* Голодный: миска */}
      {isHungry && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ bottom:0 }}>
          <span style={{ fontSize: size*0.16 }}>🍽️</span>
          <motion.div className="px-2.5 py-1 rounded-xl text-white text-[11px] font-extrabold"
            style={{ background:'#FF8A65' }}
            animate={{ rotate:[-6,-4,-7,-5,-6] }} transition={{ duration:2, repeat:Infinity }}>
            Пора экономить
          </motion.div>
        </div>
      )}

      {/* Спящий: кнопка разбудить */}
      {isSleeping && onWakeUp && (
        <motion.button initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.6 }}
          onClick={onWakeUp}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-5 py-2.5 rounded-pill text-sm font-bold bg-white shadow-card text-primary border border-primary/30 active:scale-95 transition-transform"
          style={{ bottom:-4 }}>
          👆 Разбудить
        </motion.button>
      )}
    </div>
  );
};
