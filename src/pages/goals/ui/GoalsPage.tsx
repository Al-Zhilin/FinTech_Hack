import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { formatCurrency } from '@/shared/lib/formatters';
import { motion } from 'framer-motion';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export const GoalsPage = () => {
  const { profile } = useFinanceStore();

  return (
    <motion.div className="flex flex-col bg-bg-base min-h-dvh px-5 pt-12 pb-6"
      variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Мои цели</h1>
        <p className="text-text-secondary text-sm mt-1">Отслеживай прогресс и откладывай регулярно</p>
      </motion.div>

      <div className="flex flex-col gap-4">
        {profile.goals.map(goal => {
          const pct = Math.round((goal.current / goal.target) * 100);
          const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000);
          return (
            <motion.div key={goal.id} variants={item}>
              <Card variant="default" padding="lg" pressable>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                         style={{ backgroundColor: goal.color + '18' }}>
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">{goal.title}</h3>
                      <p className="text-xs text-text-tertiary mt-0.5">Осталось {daysLeft} дней</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: goal.color }}>{pct}%</span>
                </div>
                <div className="mb-3">
                  <ProgressBar value={pct} color="primary" size="md" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary font-medium">{formatCurrency(goal.current)}</span>
                  <span className="text-text-tertiary">{formatCurrency(goal.target)}</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={item} className="mt-6">
        <button className="w-full h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-text-tertiary font-medium hover:border-primary hover:text-primary transition-colors">
          <span className="text-xl">+</span>
          Добавить цель
        </button>
      </motion.div>
    </motion.div>
  );
};
