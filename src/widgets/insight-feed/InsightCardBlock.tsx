import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAskAi } from '@/features/ask-ai';
import type { Insight } from '@/entities/insight/model/insights';

const BG = '#F19B8C';

/**
 * Встраиваемый блок-инсайт для страниц (та же начинка, что и в скролл-модалке:
 * картинка + тег + результат + рекомендация + кнопка-вопрос к AI).
 */
export const InsightCardBlock = ({ insight }: { insight: Insight }) => {
  const ask = useAskAi();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      className="rounded-2xl bg-white shadow-card overflow-hidden"
    >
      {/* Шапка-картинка на фирменном фоне */}
      <div className="relative px-5 pt-5 pb-4 flex items-center gap-3" style={{ backgroundColor: BG }}>
        <div className="absolute -top-6 -right-4 w-24 h-24 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="relative w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{insight.emoji}</span>
        </div>
        <div className="relative min-w-0">
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-[0.18em]">{insight.tag}</p>
          <h3 className="text-white font-bold text-[17px] leading-tight truncate">{insight.title}</h3>
        </div>
      </div>

      {/* Тело: результат + рекомендация + кнопка */}
      <div className="px-5 py-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-text-primary">{insight.resultValue}</span>
          <span className="text-xs text-text-tertiary font-medium uppercase tracking-wide">{insight.resultLabel}</span>
        </div>
        {insight.resultSub && (
          <p className="text-xs text-text-secondary mb-3">{insight.resultSub}</p>
        )}

        <div className="flex items-start gap-2 mb-4">
          <Sparkles size={15} className="mt-0.5 flex-shrink-0" style={{ color: BG }} />
          <p className="text-sm text-text-secondary leading-relaxed">{insight.recommendation}</p>
        </div>

        <button
          onClick={() => ask(insight.prompt)}
          className="w-full h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ backgroundColor: BG }}
        >
          <span>{insight.cta}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </motion.div>
  );
};
