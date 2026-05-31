import { motion } from 'framer-motion';

interface LogoProps {
  size?: number;
  spinning?: boolean;
}

/**
 * КопиКот mark: a balanced sphere split by an "equator" line, with an
 * orbiting coin. The orbit ring rotates while loading.
 */
export const Logo = ({ size = 96, spinning = false }: LogoProps) => (
  <div className="relative" style={{ width: size, height: size }}>
    {/* Rotating orbit ring */}
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="absolute inset-0"
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { repeat: Infinity, duration: 2.4, ease: 'linear' } : { duration: 0.4 }}
    >
      <defs>
        <linearGradient id="ekv-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8856A" />
          <stop offset="100%" stopColor="#B87EFF" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="url(#ekv-ring)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="200 90"
      />
      {/* Orbiting coin */}
      <circle cx="50" cy="4" r="5.5" fill="#FF9A7E" />
    </motion.svg>

    {/* Center sphere */}
    <motion.div
      className="absolute inset-[18%] rounded-full bg-gradient-primary shadow-primary flex items-center justify-center overflow-hidden"
      animate={spinning ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={spinning ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } : { duration: 0.3 }}
    >
      {/* Equator line */}
      <span className="absolute left-0 right-0 h-[2px] bg-white/70" />
      <span className="text-white font-bold leading-none" style={{ fontSize: size * 0.26 }}>
        Э
      </span>
    </motion.div>
  </div>
);
