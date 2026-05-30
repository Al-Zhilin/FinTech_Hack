import { useState, useEffect } from 'react';
import { getPatterns, type PatternsResult } from '@/shared/api/patterns';

const PATTERN_COLORS: Record<string, string> = {
  'живёт в ноль': 'text-warning',
  'долговая нагрузка': 'text-danger',
  'накопитель': 'text-success',
  'базовый баланс': 'text-primary',
};

const RATIO_LABELS = [
  { key: 'expense_ratio', label: 'Расходы', color: 'bg-danger' },
  { key: 'debt_ratio', label: 'Долги', color: 'bg-warning' },
  { key: 'free_ratio', label: 'Свободно', color: 'bg-success' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Еда',
  transport: 'Транспорт',
  shopping: 'Покупки',
  health: 'Здоровье',
  entertainment: 'Развлечения',
  housing: 'Жильё',
  education: 'Образование',
  subscriptions: 'Подписки',
  other: 'Прочее',
};

interface Props {
  userId: string;
}

export const PatternsWidget = ({ userId }: Props) => {
  const [data, setData] = useState<PatternsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPatterns(userId)
      .then(r => { if (!cancelled) setData(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-card p-4 animate-pulse">
        <div className="h-3 bg-border-light rounded w-1/3 mb-3" />
        <div className="h-4 bg-border-light rounded mb-2" />
        <div className="h-4 bg-border-light rounded w-4/5 mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 h-2 bg-border-light rounded-full" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasBreakdown = data.breakdown && Object.keys(data.breakdown).length > 0;
  const patternColor = data.pattern_label ? (PATTERN_COLORS[data.pattern_label.toLowerCase()] ?? 'text-primary') : 'text-primary';

  return (
    <div className="rounded-2xl bg-white shadow-card p-4 border border-border-light">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🔍</span>
        <span className="text-sm font-bold text-text-primary">Паттерн трат</span>
        {data.pattern_label && (
          <span className={`text-xs font-semibold ${patternColor} ml-auto`}>{data.pattern_label}</span>
        )}
      </div>

      <p className="text-sm text-text-secondary leading-snug mb-3">{data.insight}</p>

      {/* Ratios */}
      {(data.expense_ratio != null || data.debt_ratio != null || data.free_ratio != null) && (
        <div className="flex flex-col gap-2 mb-3">
          {RATIO_LABELS.map(({ key, label, color }) => {
            const val = data[key];
            if (val == null) return null;
            const pct = Math.round(val * 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-tertiary">{label}</span>
                  <span className="text-xs font-semibold text-text-secondary">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-border-light overflow-hidden">
                  <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Breakdown */}
      {hasBreakdown && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border-light">
          {Object.entries(data.breakdown!)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="font-semibold text-text-primary">
                  {amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
