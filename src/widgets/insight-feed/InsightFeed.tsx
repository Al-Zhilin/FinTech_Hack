import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { buildInsights } from '@/entities/insight/model/insights';
import { InsightCardBlock } from './InsightCardBlock';

interface InsightFeedProps {
  /** Сколько блоков показать (по умолчанию все). */
  limit?: number;
  title?: string;
}

/** Лента блоков-инсайтов с вопросами к AI — для встраивания в страницы. */
export const InsightFeed = ({ limit, title = 'Аналитика от AI' }: InsightFeedProps) => {
  const profile = useFinanceStore(s => s.profile);
  const insights = buildInsights(profile);
  const shown = limit ? insights.slice(0, limit) : insights;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <span className="text-xs text-text-tertiary">Спроси AI 👇</span>
      </div>
      {shown.map(insight => (
        <InsightCardBlock key={insight.tag} insight={insight} />
      ))}
    </div>
  );
};
