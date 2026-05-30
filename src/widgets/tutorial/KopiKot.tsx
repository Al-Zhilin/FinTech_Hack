/**
 * КопиКот — SVG-маскот приложения.
 * Поддерживает 8 комплектов одежды и 3 настроения.
 */

export type KopiKotOutfit =
  | 'none'
  | 'hero'
  | 'advisor'
  | 'ninja'
  | 'chef'
  | 'astronaut'
  | 'party'
  | 'grad';

export type KopiKotMood = 'happy' | 'excited' | 'think';

interface KopiKotProps {
  outfit?: KopiKotOutfit;
  mood?: KopiKotMood;
  size?: number;
  className?: string;
}

// ── Iris colour per outfit ─────────────────────────────────────────────────────
const IRIS: Record<KopiKotOutfit, string> = {
  none:      '#7B9EFF',
  hero:      '#FFD166',
  advisor:   '#4CC9F0',
  ninja:     '#BC60FF',
  chef:      '#FF9F43',
  astronaut: '#06D6A0',
  party:     '#FF6B9D',
  grad:      '#118AB2',
};

// ── Outfit layers ──────────────────────────────────────────────────────────────

function Hero() {
  return (
    <g>
      {/* Cape back layer */}
      <ellipse cx="50" cy="104" rx="28" ry="12" fill="#C1121F" />
      <path d="M22,94 Q36,114 50,118 Q64,114 78,94 L76,90 Q62,110 50,114 Q38,110 24,90Z" fill="#E63946" />
      {/* Star badge */}
      <polygon
        points="50,80 51.8,85.5 57.5,85.5 53,89 54.8,94.5 50,91 45.2,94.5 47,89 42.5,85.5 48.2,85.5"
        fill="#FFD60A" stroke="#F4A100" strokeWidth="0.6"
      />
    </g>
  );
}

function Advisor() {
  return (
    <g>
      {/* White collar */}
      <path d="M42,90 L46,100 L50,96 L54,100 L58,90" fill="white" stroke="#D4D8E0" strokeWidth="1" />
      {/* Tie */}
      <path d="M47.5,95 L50,92 L52.5,95 L51.5,109 L50,111 L48.5,109Z" fill="#4361EE" />
      <path d="M47.5,95 L50,89 L52.5,95Z" fill="#3A0CA3" />
      {/* Glasses */}
      <circle cx="38" cy="57" r="9.5" fill="rgba(200,235,255,0.12)" stroke="#4CC9F0" strokeWidth="2.5" />
      <circle cx="62" cy="57" r="9.5" fill="rgba(200,235,255,0.12)" stroke="#4CC9F0" strokeWidth="2.5" />
      <path d="M47.5,57 L52.5,57" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" />
      <path d="M28.5,54 L24,52" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" />
      <path d="M71.5,54 L76,52" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Ninja() {
  return (
    <g>
      {/* Headband */}
      <rect x="12" y="30" width="76" height="13" rx="6.5" fill="#2D1B4E" />
      {/* Forehead gem */}
      <polygon points="50,34 47,40 53,40" fill="#BC60FF" />
      <circle cx="50" cy="34" r="3" fill="#E040FB" />
      {/* Ear ribbon ends */}
      <path d="M74,40 Q82,52 79,62" stroke="#2D1B4E" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M78,40 Q86,52 84,62" stroke="#1A0F2E" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Face mask (lower half only inside face) */}
      <clipPath id="fc">
        <ellipse cx="50" cy="65" rx="38" ry="36" />
      </clipPath>
      <rect x="12" y="72" width="76" height="32" rx="0" fill="#3D1168" clipPath="url(#fc)" opacity="0.88" />
    </g>
  );
}

function Chef() {
  return (
    <g>
      {/* Toque brim */}
      <rect x="20" y="27" width="60" height="10" rx="5" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      {/* Toque puff */}
      <ellipse cx="50" cy="14" rx="24" ry="18" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      <ellipse cx="50" cy="14" rx="18" ry="12" fill="none" stroke="#F0F0F0" strokeWidth="1" />
      {/* Bow tie / neckerchief */}
      <path d="M42,91 L50,88 L58,91 L55,99 L50,97 L45,99Z" fill="#FF9F43" />
      <ellipse cx="50" cy="91" rx="4" ry="3" fill="#E07000" />
    </g>
  );
}

function Astronaut() {
  return (
    <g>
      {/* Helmet outer ring */}
      <circle cx="50" cy="63" r="44" fill="rgba(210,245,255,0.14)" stroke="white" strokeWidth="5" />
      {/* Visor shine */}
      <path d="M24,39 Q38,30 55,29 Q66,30 73,38 Q64,31 50,30 Q38,30 28,38Z"
        fill="rgba(255,255,255,0.4)" />
      {/* Suit collar */}
      <ellipse cx="50" cy="103" rx="26" ry="9" fill="white" stroke="#C8DFEF" strokeWidth="2" />
      <ellipse cx="50" cy="103" rx="10" ry="5" fill="#06D6A0" />
      {/* NASA-style mission patch */}
      <circle cx="50" cy="103" r="4" fill="white" />
      <text x="50" y="106" textAnchor="middle" fontSize="4" fill="#06D6A0" fontWeight="bold">★</text>
    </g>
  );
}

function Party() {
  return (
    <g>
      {/* Hat */}
      <polygon points="50,3 22,33 78,33" fill="#EF476F" />
      <polygon points="50,3 36,33 22,33" fill="#FFD166" />
      <polygon points="50,3 64,33 78,33" fill="#06D6A0" />
      <polygon points="50,3 44,18 56,18" fill="#118AB2" />
      {/* Brim */}
      <rect x="20" y="32" width="60" height="7" rx="3.5" fill="#FFD166" />
      {/* Pompom */}
      <circle cx="50" cy="5" r="6" fill="#FFD166" />
      <circle cx="50" cy="5" r="3" fill="white" opacity="0.6" />
      {/* Confetti */}
      {[
        [10,18,'#EF476F'], [88,14,'#4CC9F0'], [14,52,'#FFD166'],
        [86,46,'#06D6A0'], [6,72,'#BC60FF'], [93,68,'#EF476F'],
        [18,90,'#4CC9F0'], [84,88,'#FFD166'],
      ].map(([cx, cy, fill], i) => (
        <circle key={i} cx={cx as number} cy={cy as number} r="2.5" fill={fill as string} opacity="0.85" />
      ))}
    </g>
  );
}

function Grad() {
  return (
    <g>
      {/* Cap base band */}
      <ellipse cx="50" cy="26" rx="31" ry="7" fill="#1C1C1E" />
      {/* Cap flat top */}
      <rect x="21" y="17" width="58" height="11" rx="2" fill="#1C1C1E" />
      {/* Tassel string */}
      <line x1="50" y1="21" x2="72" y2="28" stroke="#FFD60A" strokeWidth="2" />
      {/* Tassel drops */}
      <line x1="72" y1="28" x2="72" y2="48" stroke="#FFD60A" strokeWidth="2.5" />
      <line x1="69" y1="48" x2="67" y2="60" stroke="#FFD60A" strokeWidth="2" />
      <line x1="72" y1="48" x2="72" y2="60" stroke="#FFD60A" strokeWidth="2" />
      <line x1="75" y1="48" x2="77" y2="60" stroke="#FFD60A" strokeWidth="2" />
      {/* Diploma scroll */}
      <rect x="34" y="90" width="32" height="22" rx="4" fill="#FFF8E1" stroke="#FFD60A" strokeWidth="1.5" />
      <line x1="39" y1="97" x2="61" y2="97" stroke="#FFD60A" strokeWidth="1.2" />
      <line x1="39" y1="102" x2="61" y2="102" stroke="#FFD60A" strokeWidth="1.2" />
      <circle cx="50" cy="108" r="4" fill="#FFD60A" />
    </g>
  );
}

const OUTFIT_MAP: Record<KopiKotOutfit, React.FC> = {
  none:      () => null,
  hero:      Hero,
  advisor:   Advisor,
  ninja:     Ninja,
  chef:      Chef,
  astronaut: Astronaut,
  party:     Party,
  grad:      Grad,
};

// ── Eyes per mood ─────────────────────────────────────────────────────────────

function Eyes({ mood, iris }: { mood: KopiKotMood; iris: string }) {
  if (mood === 'excited') {
    return (
      <g>
        {/* Wide excited eyes */}
        {[38, 62].map(cx => (
          <g key={cx}>
            <ellipse cx={cx} cy="60" rx="11" ry="13" fill="#1C0C08" />
            <ellipse cx={cx} cy="62" rx="7.5" ry="9" fill={iris} />
            <ellipse cx={cx} cy="63.5" rx="5" ry="6.5" fill="#1A0808" />
            <circle cx={cx + 2.5} cy="57.5" r="3" fill="white" />
            <circle cx={cx - 2.5} cy="65" r="1.8" fill="white" opacity="0.55" />
          </g>
        ))}
      </g>
    );
  }
  if (mood === 'think') {
    return (
      <g>
        {/* Left eye squinting */}
        <ellipse cx="38" cy="61" rx="10" ry="6" fill="#1C0C08" />
        <ellipse cx="38" cy="62" rx="6.5" ry="4" fill={iris} />
        <ellipse cx="38" cy="62.5" rx="4.5" ry="3" fill="#1A0808" />
        <circle cx="40.5" cy="60" r="2" fill="white" />
        {/* Right eye normal */}
        <ellipse cx="62" cy="60" rx="10" ry="12" fill="#1C0C08" />
        <ellipse cx="62" cy="62" rx="7" ry="8.5" fill={iris} />
        <ellipse cx="62" cy="63" rx="4.5" ry="5.5" fill="#1A0808" />
        <circle cx="64.5" cy="57" r="2.8" fill="white" />
        <circle cx="59.5" cy="65" r="1.6" fill="white" opacity="0.5" />
      </g>
    );
  }
  // happy (default)
  return (
    <g>
      {[38, 62].map(cx => (
        <g key={cx}>
          <ellipse cx={cx} cy="60" rx="10" ry="12" fill="#1C0C08" />
          <ellipse cx={cx} cy="62" rx="6.5" ry="8" fill={iris} />
          <ellipse cx={cx} cy="63.5" rx="4.5" ry="5.5" fill="#1A0808" />
          <circle cx={cx + 2} cy="57" r="2.8" fill="white" />
          <circle cx={cx - 2.5} cy="65" r="1.6" fill="white" opacity="0.5" />
        </g>
      ))}
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function KopiKot({
  outfit = 'none',
  mood   = 'happy',
  size   = 80,
  className = '',
}: KopiKotProps) {
  const OutfitLayer = OUTFIT_MAP[outfit];
  const iris = IRIS[outfit];

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Back of outfit (cape etc.) rendered before ears ── */}
      {(outfit === 'hero') && <Hero />}

      {/* ── Ears ── */}
      <polygon points="12,35 18,7 40,28"  fill="#FFE0CC" />
      <polygon points="88,35 82,7 60,28"  fill="#FFE0CC" />
      <polygon points="17,33 22,13 38,27" fill="#FFAABB" />
      <polygon points="83,33 78,13 62,27" fill="#FFAABB" />

      {/* ── Head ── */}
      <ellipse cx="50" cy="65" rx="38" ry="36" fill="#FFE0CC" />

      {/* ── Cheeks ── */}
      <ellipse cx="27" cy="74" rx="9"  ry="5.5" fill="#FFB5C8" opacity="0.45" />
      <ellipse cx="73" cy="74" rx="9"  ry="5.5" fill="#FFB5C8" opacity="0.45" />

      {/* ── Eyes ── */}
      <Eyes mood={mood} iris={iris} />

      {/* ── Nose ── */}
      <polygon points="47,78 53,78 50,83" fill="#FF8FAB" />

      {/* ── Mouth ── */}
      <path d="M44,86 Q50,94 56,86" stroke="#C06878" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* ── Whiskers ── */}
      {([[42,77,9,71],[42,80,9,83],[42,83,9,90]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i)=>(
        <line key={`lw${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4A0A8" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      ))}
      {([[58,77,91,71],[58,80,91,83],[58,83,91,90]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i)=>(
        <line key={`rw${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4A0A8" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      ))}

      {/* ── Outfit overlay (non-hero rendered after face) ── */}
      {outfit !== 'hero' && <OutfitLayer />}
    </svg>
  );
}
