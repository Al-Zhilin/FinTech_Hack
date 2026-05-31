import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/Button';

const FEATURES = [
  { emoji: '🧠', title: 'AI-анализ трат',          desc: 'Поймите, куда уходят деньги — без ручного учёта.',      gradient: 'from-[#FFF0EC] to-[#FFE4DC]' },
  { emoji: '🎯', title: 'Умные цели',               desc: 'Рассчитаем, сколько откладывать, чтобы успеть к сроку.', gradient: 'from-[#F3EAFF] to-[#E8D8FF]' },
  { emoji: '🏦', title: 'Подбор кредитов',          desc: 'Сравните банки и поймите, какой платёж вам по силам.',   gradient: 'from-[#E8F9ED] to-[#D6F5E0]' },
  { emoji: '💬', title: 'Финансовый ассистент',     desc: 'Спросите что угодно о деньгах — ответ простым языком.',  gradient: 'from-[#FFF3E0] to-[#FFE7C2]' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const item      = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export const Features = ({ onDone }: { onDone: () => void }) => (
  <div className="flex-1 flex flex-col">
    {/* Skip */}
    <div className="flex justify-end px-5 pt-5">
      <button onClick={onDone} className="text-sm font-medium text-text-tertiary px-3 py-1.5">
        Пропустить
      </button>
    </div>

    {/* Header */}
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-6 pt-4 pb-6">
      <h2 className="text-2xl font-bold text-text-primary leading-tight mb-1">
        Всё для финансового здоровья
      </h2>
      <p className="text-text-secondary text-sm">В одном приложении с AI</p>
    </motion.div>

    {/* 2×2 grid */}
    <motion.div variants={container} initial="hidden" animate="show"
      className="px-5 grid grid-cols-2 gap-3 flex-1">
      {FEATURES.map(f => (
        <motion.div key={f.emoji} variants={item}
          className={`rounded-2xl p-4 bg-gradient-to-br ${f.gradient} flex flex-col gap-2`}>
          <span className="text-3xl leading-none">{f.emoji}</span>
          <p className="font-bold text-sm text-text-primary leading-snug">{f.title}</p>
          <p className="text-[11px] text-text-secondary leading-snug">{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>

    {/* CTA */}
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.35 }}
      className="px-6 pt-5 pb-10">
      <Button size="lg" fullWidth onClick={onDone}>
        Создать аккаунт →
      </Button>
    </motion.div>
  </div>
);
