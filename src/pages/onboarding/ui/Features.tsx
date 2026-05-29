import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/Button';

interface Feature {
  emoji: string;
  title: string;
  desc: string;
  gradient: string;
  accent: string;
}

const FEATURES: Feature[] = [
  {
    emoji: '🧠',
    title: 'AI-анализ ваших трат',
    desc: 'Подключите данные — и увидите, куда реально уходят деньги, без ручного учёта.',
    gradient: 'from-[#FFF0EC] to-[#FFE4DC]',
    accent: 'bg-primary',
  },
  {
    emoji: '🎯',
    title: 'Умные цели и накопления',
    desc: 'Ставьте цели, а мы рассчитаем, сколько откладывать, чтобы успеть к сроку.',
    gradient: 'from-[#F3EAFF] to-[#E8D8FF]',
    accent: 'bg-purple',
  },
  {
    emoji: '🏦',
    title: 'Подбор кредитов и ипотеки',
    desc: 'Сравните предложения банков и поймите, какой платёж вам по силам.',
    gradient: 'from-[#E8F9ED] to-[#D6F5E0]',
    accent: 'bg-success',
  },
  {
    emoji: '💬',
    title: 'Финансовый ассистент в чате',
    desc: 'Спросите что угодно о своих деньгах — ассистент ответит простым языком.',
    gradient: 'from-[#FFF3E0] to-[#FFE7C2]',
    accent: 'bg-warning',
  },
];

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export const Features = ({ onDone }: { onDone: () => void }) => {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const isLast = index === FEATURES.length - 1;
  const f = FEATURES[index];

  const next = () => {
    if (isLast) return onDone();
    setDir(1);
    setIndex(i => i + 1);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-5">
        <button onClick={onDone} className="text-sm font-medium text-text-tertiary px-3 py-1.5">
          Пропустить
        </button>
      </div>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full flex flex-col items-center"
          >
            <div className={`w-full aspect-square max-h-[44vh] rounded-3xl bg-gradient-to-br ${f.gradient} flex items-center justify-center relative overflow-hidden`}>
              <span className="text-[100px] leading-none drop-shadow-sm">{f.emoji}</span>
              {/* mock floating chips */}
              <span className="absolute top-6 left-6 px-3 py-1.5 rounded-pill bg-white/80 backdrop-blur text-xs font-semibold text-text-primary shadow-card">
                +12% к накоплениям
              </span>
              <span className="absolute bottom-8 right-6 px-3 py-1.5 rounded-pill bg-white/80 backdrop-blur text-xs font-semibold text-text-primary shadow-card">
                Прогноз готов
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="px-6 pb-10 pt-6 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="min-h-[96px]"
          >
            <h2 className="text-2xl font-bold text-text-primary mb-2 leading-tight">{f.title}</h2>
            <p className="text-text-secondary leading-relaxed">{f.desc}</p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-1.5 justify-center">
          {FEATURES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
            />
          ))}
        </div>

        <Button size="lg" fullWidth onClick={next}>
          {isLast ? 'Создать аккаунт →' : 'Далее'}
        </Button>
      </div>
    </div>
  );
};
