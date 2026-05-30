import { motion } from 'framer-motion';
import type { CalculatorResult } from '@/shared/types';
import { formatCurrency } from '@/shared/lib/formatters';

const TRAFFIC_COLORS = {
  green: { bg: 'bg-success-light', text: 'text-success', dot: 'bg-success', label: 'Всё хорошо' },
  yellow: { bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-warning', label: 'Требует внимания' },
  red: { bg: 'bg-danger-light', text: 'text-danger', dot: 'bg-danger', label: 'Критично' },
};

interface Props {
  result: CalculatorResult;
}

export const CalculatorResultCard = ({ result }: Props) => {
  const isEmpty = !result.health && !result.savings_plan && !result.cashflow && !result.traffic_light;
  if (isEmpty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="ml-10 flex flex-col gap-2 mt-1"
    >
      {/* Traffic light */}
      {result.traffic_light && (() => {
        const color = result.traffic_light.color ?? 'yellow';
        const cfg = TRAFFIC_COLORS[color] ?? TRAFFIC_COLORS.yellow;
        return (
          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${cfg.bg}`}>
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <div className="min-w-0">
              <p className={`text-xs font-bold ${cfg.text}`}>
                {result.traffic_light.label ?? cfg.label}
              </p>
              {result.traffic_light.message && (
                <p className="text-xs text-text-secondary mt-0.5">{result.traffic_light.message}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Health */}
      {result.health && (
        <div className="bg-white border border-border-light rounded-xl p-3 shadow-card">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
            Финансовое здоровье
          </p>
          <div className="flex items-center gap-3">
            {result.health.score != null && (
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E5EA" strokeWidth="3.2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={result.health.score >= 70 ? '#4CAF50' : result.health.score >= 40 ? '#FF9500' : '#FF3B30'}
                    strokeWidth="3.2"
                    strokeDasharray={`${result.health.score} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary">
                  {result.health.score}
                </span>
              </div>
            )}
            <div className="min-w-0">
              {result.health.label && (
                <p className="text-sm font-semibold text-text-primary">{result.health.label}</p>
              )}
              {result.health.summary && (
                <p className="text-xs text-text-secondary leading-snug mt-0.5">{result.health.summary}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Savings plan */}
      {result.savings_plan && (
        <div className="bg-white border border-border-light rounded-xl p-3 shadow-card">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
            План накоплений
          </p>
          <div className="flex items-center justify-between mb-1.5">
            {result.savings_plan.monthly != null && (
              <div>
                <p className="text-xs text-text-tertiary">В месяц</p>
                <p className="text-base font-bold text-primary">{formatCurrency(result.savings_plan.monthly)}</p>
              </div>
            )}
            {result.savings_plan.period_months != null && (
              <div className="text-right">
                <p className="text-xs text-text-tertiary">Срок</p>
                <p className="text-base font-bold text-text-primary">{result.savings_plan.period_months} мес.</p>
              </div>
            )}
            {result.savings_plan.target != null && (
              <div className="text-right">
                <p className="text-xs text-text-tertiary">Цель</p>
                <p className="text-base font-bold text-text-primary">{formatCurrency(result.savings_plan.target)}</p>
              </div>
            )}
          </div>
          {result.savings_plan.recommendation && (
            <p className="text-xs text-text-secondary leading-snug">{result.savings_plan.recommendation}</p>
          )}
        </div>
      )}

      {/* Cashflow */}
      {result.cashflow && (
        <div className={`border rounded-xl p-3 shadow-card ${result.cashflow.will_be_negative ? 'bg-danger-light border-danger/20' : 'bg-white border-border-light'}`}>
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
            Кэшфлоу до зарплаты
          </p>
          {result.cashflow.verdict && (
            <p className="text-sm text-text-primary leading-snug">{result.cashflow.verdict}</p>
          )}
          {result.cashflow.danger_day != null && (
            <p className="text-xs text-danger font-medium mt-1">
              ⚠ Деньги закончатся через {result.cashflow.danger_day} дн.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};
