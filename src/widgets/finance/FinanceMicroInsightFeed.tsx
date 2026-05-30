import { motion } from 'framer-motion';
import { MascotAdvisor } from '@/shared/ui/MascotAdvisor';
import type { MicroInsight } from '@/entities/finance/model/financeMicroInsights';

const TONE_STYLES: Record<MicroInsight['tone'], string> = {
  tip: 'bg-primary-light border-primary/15',
  celebration: 'bg-success-light border-success/15',
  warning: 'bg-warning-light border-warning/20',
};

interface Props {
  insights: MicroInsight[];
}

export const FinanceMicroInsightFeed = ({ insights }: Props) => {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">Советы от AI</h2>
        <span className="text-[11px] text-text-tertiary">живые подсказки</span>
      </div>
      {insights.map((insight, i) => (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className={`rounded-2xl p-3.5 border ${TONE_STYLES[insight.tone]}`}
        >
          <MascotAdvisor size="sm">
            <p className="text-sm text-text-secondary leading-snug">
              <span className="mr-1">{insight.emoji}</span>
              {insight.text}
            </p>
          </MascotAdvisor>
        </motion.div>
      ))}
    </div>
  );
};
