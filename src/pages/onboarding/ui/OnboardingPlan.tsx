import { motion } from 'framer-motion';
import { CheckCircle, TrendingUp, Target, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface OnboardingPlanProps {
  name: string;
  summary: string;
  onEnter: () => void;
}

// Разбивает AI-summary на читаемые блоки плана
const parsePlanItems = (summary: string): string[] => {
  if (!summary) return [];
  // Разбиваем по точкам, переносам и нумерованным пунктам
  const raw = summary
    .split(/(?:\n|(?<=\.)\s+(?=[А-ЯA-Z🔹•\-\d]))/g)
    .map(s => s.replace(/^[\d\.\-•*]+\s*/, '').trim())
    .filter(s => s.length > 10 && s.length < 200);
  return raw.slice(0, 5);
};

const PLAN_ICONS = [TrendingUp, Target, Shield, Sparkles, CheckCircle];
const PLAN_COLORS = ['text-success', 'text-primary', 'text-purple', 'text-warning', 'text-success'];
const PLAN_BG = ['bg-success-light', 'bg-primary-light', 'bg-purple/10', 'bg-warning-light', 'bg-success-light'];

export const OnboardingPlan = ({ name, summary, onEnter }: OnboardingPlanProps) => {
  const firstName = name.split(' ')[0];
  const items = parsePlanItems(summary);

  return (
    <div className="w-full max-w-mobile mx-auto flex flex-col min-h-dvh bg-bg-base overflow-y-auto">
      <div className="flex flex-col px-6 pt-14 pb-10 flex-1">
        {/* Иконка + заголовок */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative mb-5">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-primary">
              <span className="text-5xl">📋</span>
            </div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-success flex items-center justify-center shadow-lg"
            >
              <CheckCircle size={20} className="text-white" />
            </motion.div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-text-primary text-center leading-tight mb-2"
          >
            {firstName}, план готов!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-text-secondary text-center text-[15px] leading-snug"
          >
            AI проанализировал ваши ответы и составил персональный план улучшения финансового состояния
          </motion.p>
        </motion.div>

        {/* Карточки плана */}
        {items.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3 mb-8"
          >
            {items.map((item, i) => {
              const Icon = PLAN_ICONS[i % PLAN_ICONS.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.07 }}
                  className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-card"
                >
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${PLAN_BG[i % PLAN_BG.length]}`}>
                    <Icon size={16} className={PLAN_COLORS[i % PLAN_COLORS.length]} />
                  </span>
                  <p className="text-sm text-text-secondary leading-snug pt-0.5">{item}</p>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* Fallback если summary пустой или не парсится */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3 mb-8"
          >
            {[
              { Icon: TrendingUp, text: 'Персональный бюджет на основе ваших доходов и расходов', color: 'text-success', bg: 'bg-success-light' },
              { Icon: Target,     text: 'Стратегия достижения финансовых целей',                   color: 'text-primary', bg: 'bg-primary-light' },
              { Icon: Shield,     text: 'Рекомендации по формированию подушки безопасности',         color: 'text-purple',  bg: 'bg-purple/10' },
              { Icon: Sparkles,   text: 'AI-советы и еженедельные инсайты по вашим тратам',         color: 'text-warning', bg: 'bg-warning-light' },
            ].map(({ Icon, text, color, bg }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.07 }}
                className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-card"
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon size={16} className={color} />
                </span>
                <p className="text-sm text-text-secondary leading-snug pt-0.5">{text}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Тизер дашборда */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="bg-primary-light rounded-2xl px-4 py-4 mb-8 border border-primary/15"
        >
          <p className="text-xs text-primary/60 uppercase tracking-widest mb-1.5 font-semibold">На главной странице</p>
          <p className="text-text-secondary text-sm leading-snug">
            Раздел <span className="font-semibold text-text-primary">«Мой план»</span> — пошаговые рекомендации,
            AI-инсайты и прогноз по улучшению финансового здоровья будут доступны всегда.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-auto"
        >
          <Button size="lg" fullWidth onClick={onEnter}
            className="h-14 text-base">
            <span>Смотреть мой план</span>
            <ArrowRight size={20} className="ml-2" />
          </Button>
          <p className="text-center text-text-tertiary text-xs mt-3">
            Вы всегда можете обновить профиль в настройках
          </p>
        </motion.div>
      </div>
    </div>
  );
};
