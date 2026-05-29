import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';

const STEPS = [
  'Обрабатываем профиль',
  'Анализируем категории трат',
  'Считаем финансовое здоровье',
  'Формируем рекомендации',
];

export const Analyzing = ({ onDone }: { onDone: () => void }) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(a => {
        if (a >= STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(onDone, 650);
          return a;
        }
        return a + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-hero px-8 gap-8">
      <Logo size={92} spinning />
      <h2 className="text-xl font-bold text-text-primary text-center">Анализируем ваши финансы…</h2>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STEPS.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <motion.div
              key={label}
              className="flex items-center gap-3"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: done || current ? 1 : 0.4 }}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-success' : current ? 'bg-primary' : 'bg-border'}`}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : current ? (
                  <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
              </span>
              <span className={`text-sm font-medium ${done || current ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
