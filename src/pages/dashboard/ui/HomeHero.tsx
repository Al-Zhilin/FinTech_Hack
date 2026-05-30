import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Wallet, Landmark } from 'lucide-react';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { useFinanceAnalysis } from '@/entities/finance/model/financeStore';
import { formatCurrency } from '@/shared/lib/formatters';
import { AskAiButton } from '@/features/ask-ai';

interface HomeHeroProps {
  onConnectBank?: () => void;
  onAddTransaction?: () => void;
}

export const HomeHero = ({ onConnectBank, onAddTransaction }: HomeHeroProps) => {
  const { bankConnected } = useUserTxStore();
  const analysis = useFinanceAnalysis();
  const { health, recommendation, balanceSummary } = analysis;

  return (
    <div className="flex flex-col gap-4 px-5">
      {/* Блок 1: Остаток + индекс здоровья */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 bg-gradient-primary text-white shadow-primary relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-white/80" />
              <p className="text-white/80 text-sm">Осталось сейчас</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{health.emoji}</span>
              <span className="text-sm font-semibold text-white/90">{health.label}</span>
            </div>
          </div>

          <p className="text-4xl font-bold mb-1">{formatCurrency(balanceSummary.totalBalance)}</p>
          <p className="text-white/70 text-xs leading-snug mb-3">{balanceSummary.hint}</p>

          {/* Индекс здоровья — всегда по реальным данным */}
          <div className="mb-4 rounded-2xl bg-white/15 px-3 py-2.5">
            {health.score != null ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-white/80 font-medium">
                    Финансовое здоровье
                    {health.confidence === 'partial' && ' · предварительно'}
                  </p>
                  <p className="text-sm font-bold">{health.score}/100</p>
                </div>
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${health.score}%` }}
                    transition={{ duration: 0.6 }}
                    key={health.score}
                  />
                </div>
                {health.breakdown && (
                  <div className="flex justify-between mt-1.5 text-[10px] text-white/65">
                    <span>Сбережения {health.breakdown.savings}</span>
                    <span>Долги {health.breakdown.debt}</span>
                    <span>Подушка {health.breakdown.cushion}</span>
                  </div>
                )}
                <p className="text-[10px] text-white/60 mt-1.5 leading-snug">{health.summary}</p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-white/80 font-medium mb-1.5">{health.summary}</p>
                {health.confidence === 'none' && (
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <motion.div className="h-full bg-white/40 rounded-full w-0" />
                  </div>
                )}
              </>
            )}
          </div>

          {balanceSummary.safeAmount > 0 && balanceSummary.safeAmount < balanceSummary.totalBalance && (
            <p className="text-xs text-white/80 mb-3">
              Безопасно потратить: <span className="font-bold">{formatCurrency(balanceSummary.safeAmount)}</span>
            </p>
          )}

          {(onConnectBank || onAddTransaction) && (
            <button
              onClick={bankConnected ? onAddTransaction : onConnectBank}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/20 hover:bg-white/25 active:scale-[0.98] transition-all text-sm font-semibold"
            >
              {bankConnected ? <Plus size={18} /> : <Landmark size={18} />}
              {bankConnected ? 'Добавить доход / расход' : 'Подключить банк'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Блок 2: Рекомендация на сегодня */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 bg-gradient-card-purple border border-purple/15"
        key={`${recommendation.title}-${recommendation.body}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-lg bg-purple/15 flex items-center justify-center text-purple">
            <Sparkles size={15} />
          </span>
          <p className="text-xs font-bold text-purple uppercase tracking-wide">Рекомендация на сегодня</p>
        </div>
        <p className="font-bold text-text-primary mb-1">{recommendation.title}</p>
        <p className="text-sm text-text-secondary leading-snug mb-3">{recommendation.body}</p>
        <AskAiButton
          variant="chip"
          question={`${recommendation.title}. ${recommendation.body} Объясни подробнее на моих данных.`}
          label="Почему так?"
        />
      </motion.div>
    </div>
  );
};
