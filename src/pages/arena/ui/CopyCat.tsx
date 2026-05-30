import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import { getCatState, getRandomPhrase, findShopItem } from '@/entities/arena/model/copyCat';
import type { CatPhrase } from '@/entities/arena/model/copyCat';

type PhraseType = 'wisdom' | 'reminder' | 'meow';
const PHRASE_TAG: Record<PhraseType, { tag: string; color: string }> = {
  wisdom:   { tag: '💡 Мудрость',    color: '#6C5CE7' },
  reminder: { tag: '⏰ Напоминание', color: '#F59E0B' },
  meow:     { tag: '🐾 КопиКот',     color: '#00B894' },
};

// Stable particle data (deterministic positions)
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  emoji: ['🪙','⭐','✨','💰','🎊','🎉','💫','🏅'][i % 8],
  x: ((i * 23 + (i % 4) * 40) % 270) - 15,
  delay: (i % 5) * 0.11,
  dur: 1.3 + (i % 4) * 0.28,
  rot: (i % 2 === 0 ? 1 : -1) * (80 + i * 17),
}));

function Particles({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map(p => (
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

// ── SVG cat illustration ──────────────────────────────────────────────────────
// Matches reference: round fluffy white cat, red inner ears, black collar,
// red paw-print medal, red cape, raised paw with pink pads.
function CatSvg({ catState, belly }: { catState: string; belly: boolean }) {
  const rich     = catState === 'rich';
  const hungry   = catState === 'hungry';
  const sad      = catState === 'sad';
  const sleeping = catState === 'sleeping';
  const festive  = catState === 'festive';

  // ── Eyes ──
  const LeftEye = () => {
    if (sleeping) return (
      <path d="M 84 103 Q 100 115 116 103"
            stroke="#1A1A2E" strokeWidth="4" strokeLinecap="round" fill="none"/>
    );
    if (rich) return (
      // squinting smug — arc points up
      <path d="M 85 102 Q 100 90 115 102"
            stroke="#1A1A2E" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
    );
    if (sad || hungry) return (
      <g>
        <ellipse cx="100" cy="101" rx="13" ry="15" fill="#1A1A2E"/>
        <circle cx="105" cy="95" r="5" fill="white"/>
        {sad && <ellipse cx="87" cy="112" rx="4" ry="6" fill="#90CAF9" opacity="0.75"/>}
      </g>
    );
    if (festive || belly) return (
      <g>
        <ellipse cx="100" cy="99" rx="14" ry="17" fill="#1A1A2E"/>
        <circle cx="106" cy="92" r="6.5" fill="white"/>
      </g>
    );
    // normal: winking
    return (
      <path d="M 85 101 Q 100 88 115 101"
            stroke="#1A1A2E" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
    );
  };

  const RightEye = () => {
    if (sleeping) return (
      <path d="M 144 103 Q 160 115 176 103"
            stroke="#1A1A2E" strokeWidth="4" strokeLinecap="round" fill="none"/>
    );
    if (rich) return (
      <path d="M 145 102 Q 160 90 175 102"
            stroke="#1A1A2E" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
    );
    if (sad) return (
      <g>
        <ellipse cx="160" cy="101" rx="13" ry="15" fill="#1A1A2E"/>
        <circle cx="165" cy="95" r="5" fill="white"/>
        <ellipse cx="173" cy="112" rx="4" ry="6" fill="#90CAF9" opacity="0.75"/>
      </g>
    );
    if (hungry) return (
      <g>
        <ellipse cx="160" cy="101" rx="13" ry="15" fill="#1A1A2E"/>
        <circle cx="165" cy="95" r="5" fill="white"/>
      </g>
    );
    // normal / festive / belly — main expressive eye
    return (
      <g>
        <ellipse cx="160" cy="98" rx="15" ry="17" fill="#1A1A2E"/>
        <circle cx="166" cy="91" r="6.5" fill="white"/>
        {(festive || belly) && (
          <ellipse cx="160" cy="96" rx="5" ry="5.5" fill="#3D5AFE" opacity="0.5"/>
        )}
      </g>
    );
  };

  const Mouth = () => {
    if (sleeping || sad) return (
      <path d="M 122 134 Q 130 130 138 134"
            stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    );
    if (rich) return (
      <path d="M 117 131 Q 131 143 149 128"
            stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    );
    if (hungry) return (
      <path d="M 120 136 Q 130 129 140 136"
            stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    );
    if (festive) return (
      <path d="M 113 131 Q 130 149 147 131 Q 130 141 113 131 Z"
            fill="#FF8A80" stroke="#1A1A2E" strokeWidth="1.5"/>
    );
    return (
      <path d="M 118 133 Q 130 142 142 133"
            stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    );
  };

  return (
    <svg viewBox="0 0 260 304" fill="none" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="cc-fur" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stopColor="#FFFFFF"/>
          <stop offset="55%"  stopColor="#F9F9FF"/>
          <stop offset="100%" stopColor="#EAEAF5"/>
        </radialGradient>
        <radialGradient id="cc-furb" cx="34%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#FFFFFF"/>
          <stop offset="60%"  stopColor="#F7F7FD"/>
          <stop offset="100%" stopColor="#E7E7F2"/>
        </radialGradient>
        <linearGradient id="cc-cape" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="#EF2727"/>
          <stop offset="100%" stopColor="#8B0000"/>
        </linearGradient>
        <radialGradient id="cc-medal" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#FF5252"/>
          <stop offset="100%" stopColor="#CC0000"/>
        </radialGradient>
        <filter id="cc-drop" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor="#00000015"/>
        </filter>
      </defs>

      {/* ── Cape (behind everything) ── */}
      <motion.path
        fill="url(#cc-cape)"
        animate={{ d: [
          'M 46 180 Q 8 254 34 300 L 130 285 L 226 300 Q 252 254 214 180 Q 172 196 130 197 Q 88 196 46 180 Z',
          'M 42 182 Q 2 258 30 300 L 130 287 L 230 300 Q 258 258 218 182 Q 175 198 130 199 Q 85 198 42 182 Z',
          'M 46 180 Q 8 254 34 300 L 130 285 L 226 300 Q 252 254 214 180 Q 172 196 130 197 Q 88 196 46 180 Z',
        ]}}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Body ── */}
      <ellipse cx="130" cy="228" rx="84" ry="66" fill="url(#cc-furb)" filter="url(#cc-drop)"/>
      {/* body shine */}
      <ellipse cx="108" cy="205" rx="34" ry="23" fill="white" opacity="0.42"/>

      {/* ── Head ── */}
      <circle cx="130" cy="108" r="92" fill="url(#cc-fur)" filter="url(#cc-drop)"/>
      {/* head shine */}
      <ellipse cx="105" cy="79" rx="40" ry="28" fill="white" opacity="0.40"/>

      {/* ── Left ear ── */}
      <path d="M 53 74 L 42 18 L 108 63 Z" fill="url(#cc-fur)"/>
      <path d="M 60 68 L 51 28 L 104 62 Z" fill="#E53E3E" opacity="0.90"/>
      <path d="M 65 62 L 59 36 L 92 61 Z" fill="#FF8A80" opacity="0.55"/>

      {/* ── Right ear ── */}
      <path d="M 152 63 L 218 18 L 207 74 Z" fill="url(#cc-fur)"/>
      <path d="M 156 62 L 209 28 L 200 68 Z" fill="#E53E3E" opacity="0.90"/>
      <path d="M 168 61 L 201 36 L 195 62 Z" fill="#FF8A80" opacity="0.55"/>

      {/* ── Cheeks ── */}
      <ellipse cx="76" cy="122" rx="14" ry="10" fill="#FFB3C1" opacity="0.60"/>
      <ellipse cx="184" cy="122" rx="14" ry="10" fill="#FFB3C1" opacity="0.60"/>

      {/* ── Eyes ── */}
      <LeftEye/>
      <RightEye/>

      {/* ── Nose ── */}
      <path d="M 125 121 L 130 128 L 135 121 Q 131 116 129 116 Z" fill="#1A1A2E"/>
      <ellipse cx="127" cy="120" rx="2.2" ry="1.6" fill="rgba(255,255,255,0.38)"/>

      {/* ── Mouth ── */}
      <Mouth/>

      {/* ── Collar ── */}
      <path d="M 46 177 Q 130 192 214 177 L 217 189 Q 130 206 43 189 Z" fill="#1A1A2E"/>
      <path d="M 54 178 Q 130 191 206 178"
            stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>

      {/* ── Medal ── */}
      <circle cx="130" cy="199" r="17" fill="url(#cc-medal)"/>
      <circle cx="130" cy="199" r="17" fill="none" stroke="#880000" strokeWidth="1.5"/>
      {/* paw pads on medal */}
      <ellipse cx="130" cy="203" rx="5.2" ry="5.8" fill="white"/>
      <circle cx="122" cy="195" r="3"   fill="white"/>
      <circle cx="130" cy="193" r="3"   fill="white"/>
      <circle cx="138" cy="195" r="3"   fill="white"/>

      {/* ── Raised right paw: thumbs-up 👍 (like the reference) ── */}
      {!sleeping && !sad && !hungry && (
        <motion.g
          style={{ transformOrigin: '206px 206px' }}
          animate={{ rotate: [-4, 6, -4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          {/* forearm */}
          <path d="M 176 214 Q 188 196 206 190 L 224 206 Q 214 224 196 230 Z"
                fill="url(#cc-furb)"/>
          {/* fist */}
          <rect x="188" y="158" width="42" height="46" rx="21" fill="url(#cc-furb)"/>
          {/* curled-finger seams on the fist */}
          <path d="M 213 168 Q 224 170 224 180" stroke="#D9D9EC" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M 213 180 Q 225 182 224 192" stroke="#D9D9EC" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* thumb pointing up */}
          <rect x="184" y="136" width="18" height="36" rx="9"
                fill="url(#cc-furb)" transform="rotate(-12 193 154)"/>
          {/* pink thumb pad */}
          <ellipse cx="189" cy="142" rx="4.5" ry="5.5" fill="#FFB3C1" transform="rotate(-12 189 142)"/>
        </motion.g>
      )}

      {/* ── Left arm (resting) ── */}
      {!sleeping && !belly && (
        <ellipse cx="56" cy="202" rx="20" ry="24" fill="url(#cc-furb)"/>
      )}

      {/* ── Hungry: pointing paw ── */}
      {hungry && (
        <g>
          <ellipse cx="208" cy="194" rx="18" ry="22"
                   fill="url(#cc-furb)" transform="rotate(28 208 194)"/>
          <ellipse cx="208" cy="200" rx="6" ry="7" fill="#FFB3C1"/>
          <circle cx="201" cy="192" r="3" fill="#FFB3C1"/>
          <circle cx="208" cy="190" r="3" fill="#FFB3C1"/>
          <circle cx="215" cy="192" r="3" fill="#FFB3C1"/>
        </g>
      )}

      {/* ── Sad: drooping tail ── */}
      {sad && (
        <path d="M 198 268 Q 236 250 220 226 Q 210 212 222 198"
              stroke="#E8E8F5" strokeWidth="18" strokeLinecap="round" fill="none"/>
      )}

      {/* ── Belly (long press) ── */}
      {belly && (
        <ellipse cx="130" cy="238" rx="46" ry="36" fill="#FFB3C1" opacity="0.58"/>
      )}
    </svg>
  );
}

// ── Main interactive component ────────────────────────────────────────────────
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
    rich: '#FFD700', normal: '#B87EFF', hungry: '#FF8A65',
    sad: '#90A4AE', sleeping: '#7986CB', festive: '#FFD700',
  };

  const [bubble, setBubble]   = useState<CatPhrase | null>(null);
  const [belly,  setBelly]    = useState(false);
  const [tapCount, setTapCount] = useState(0);
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

  const handleTap = useCallback(() => {
    if (!interactive || didLong.current) { didLong.current = false; return; }
    if (isSad) {
      const next = tapCount + 1;
      setTapCount(next);
      if (next < 2) return;                           // ignore first tap
    }
    if (isSleeping) {
      say({ type: 'meow', text: 'Ммм... проснулся. Соскучился по мне? 😴' });
      return;
    }
    say(getRandomPhrase());
  }, [interactive, isSad, isSleeping, tapCount, say]);

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

  // Per-state container animation
  const catMotion = isFestive
    ? { animate: { y: [0, -32, 0, -20, 0], rotate: [0, -6, 6, -3, 0] },
        transition: { duration: 0.65, repeat: 6, repeatType: 'loop' as const } }
    : isSleeping
    ? { animate: { rotate: 14, y: 8 },
        transition: { type: 'spring', stiffness: 70, damping: 14 } }
    : { animate: { y: [0, -9, 0] },
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' as const } };

  const SLOT_POS: Record<string, { top: string; left: string; size: number }> = {
    head: { top: '-4%', left: '50%', size: 0.30 },
    face: { top: '34%', left: '50%', size: 0.24 },
    neck: { top: '67%', left: '50%', size: 0.20 },
    paw:  { top: '52%', left: '84%', size: 0.18 },
    feet: { top: '84%', left: '50%', size: 0.24 },
  };

  return (
    <div className="relative select-none" style={{ width: size, height: size * 1.28 }}>

      {/* Confetti for festive */}
      <Particles active={isFestive} />

      {/* Speech bubble */}
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble.text}
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="absolute z-20 max-w-[270px] rounded-2xl bg-white px-4 py-2.5 shadow-card border-2"
            style={{
              borderColor: PHRASE_TAG[bubble.type as PhraseType]?.color ?? '#6C5CE7',
              top: 0, left: '50%', transform: 'translateX(-50%) translateY(-105%)',
            }}
          >
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

      {/* Ambient aura */}
      <motion.div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{
          width: size * 0.82, height: size * 0.82,
          top: '20%', left: '50%', transform: 'translateX(-50%)',
          background: auraColor[stateKey] ?? '#B87EFF',
          opacity: isSad || isSleeping ? 0.14 : 0.30,
        }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rich: gold pile */}
      {isRich && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 text-3xl pointer-events-none"
          style={{ bottom: size * 0.04 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity }}>
          💰🪙💰
        </motion.div>
      )}

      {/* ZZZ */}
      {isSleeping && (
        <motion.div
          className="absolute font-black text-[#7986CB] pointer-events-none"
          style={{ top: '6%', right: '16%', fontSize: size * 0.15 }}
          animate={{ opacity: [0, 1, 0], y: [0, -(size * 0.32)], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity }}>
          Z z z
        </motion.div>
      )}

      {/* Sad: first tap ❓ */}
      <AnimatePresence>
        {isSad && tapCount === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0,1,0], scale: [0,1.3,0] }}
            exit={{}} transition={{ duration: 1.4 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none">
            ❓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cat body */}
      <motion.div
        className="cursor-pointer"
        style={{ width: size, height: size, marginTop: size * 0.08, scaleX: isSad ? -1 : 1 }}
        animate={catMotion.animate as object}
        transition={catMotion.transition}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onClick={handleTap}
      >
        <CatSvg catState={stateKey} belly={belly}/>

        {/* Accessories */}
        {equipped.map(id => {
          const item = findShopItem(id);
          if (!item?.slot) return null;
          const pos = SLOT_POS[item.slot];
          if (!pos) return null;
          return (
            <span key={id} className="absolute -translate-x-1/2 pointer-events-none"
                  style={{ top: pos.top, left: pos.left, fontSize: size * pos.size }}>
              {item.emoji}
            </span>
          );
        })}
      </motion.div>

      {/* Hungry: bowl */}
      {isHungry && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
             style={{ bottom: 0 }}>
          <span style={{ fontSize: size * 0.16 }}>🍽️</span>
          <motion.div
            className="px-2.5 py-1 rounded-xl text-white text-[11px] font-extrabold"
            style={{ background: '#FF8A65' }}
            animate={{ rotate: [-6, -4, -7, -5, -6] }}
            transition={{ duration: 2, repeat: Infinity }}>
            Пора экономить
          </motion.div>
        </div>
      )}

      {/* Sleeping: wake-up button */}
      {isSleeping && onWakeUp && (
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onWakeUp}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-5 py-2.5 rounded-pill text-sm font-bold bg-white shadow-card text-primary border border-primary/30 active:scale-95 transition-transform"
          style={{ bottom: -4 }}>
          👆 Разбудить
        </motion.button>
      )}
    </div>
  );
};
