import { motion } from 'framer-motion';
import { Lock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatters';
import { CashflowWidget } from '@/widgets/cashflow/CashflowWidget';
import { PatternsWidget } from '@/widgets/patterns/PatternsWidget';

interface Props {
  unlocked: boolean;
  remaining: number;
  expenseCount: number;
  userId?: string;
  yearSavings: number;
  yearHealth: number;
  onAddTransaction: () => void;
}

export const ForecastSection = ({
  unlocked,
  remaining,
  expenseCount,
  userId,
  yearSavings,
  yearHealth,
  onAddTransaction,
}: Props) => {
  if (!unlocked) {
    const progress = Math.min(100, Math.round((expenseCount / 5) * 100));

    return (
      <div className="rounded-2xl bg-white shadow-card p-4 border border-border-light relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/95 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-bg-muted flex items-center justify-center mb-3">
            <Lock size={22} className="text-text-tertiary" />
          </div>
          <p className="text-sm font-bold text-text-primary mb-1">ИИ изучает ваши привычки…</p>
          <p className="text-xs text-text-secondary leading-snug mb-4">
            {remaining > 0
              ? `Добавьте ещё ${remaining} ${remaining === 1 ? 'трату' : remaining < 5 ? 'траты' : 'трат'}, чтобы открыть прогноз на год`
              : 'Запишите несколько трат — и прогнозы станут доступны'}
          </p>
          <div className="w-full max-w-[200px] h-1.5 rounded-full bg-border-light overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <button
            onClick={onAddTransaction}
            className="text-sm font-semibold text-primary px-4 py-2 rounded-xl bg-primary-light active:scale-95 transition-transform"
          >
            Записать трату
          </button>
        </div>

        <div className="opacity-30 pointer-events-none select-none blur-[1px]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-success" />
            <p className="text-sm font-bold text-text-primary">Прогноз через год</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-success-light rounded-xl p-3 text-center">
              <p className="text-[10px] text-text-tertiary mb-0.5">Накопления</p>
              <p className="font-bold text-sm text-success">—</p>
            </div>
            <div className="bg-bg-muted rounded-xl p-3 text-center">
              <p className="text-[10px] text-text-tertiary mb-0.5">Долги</p>
              <p className="font-bold text-sm text-text-primary">—</p>
            </div>
            <div className="bg-primary-light rounded-xl p-3 text-center">
              <p className="text-[10px] text-text-tertiary mb-0.5">Здоровье</p>
              <p className="font-bold text-sm text-primary">—</p>
            </div>
          </div>
          <div className="rounded-xl bg-bg-muted p-3 text-xs text-text-tertiary">
            Прогноз до зарплаты · Паттерн трат
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-success" />
          <p className="text-sm font-bold text-text-primary">Если ничего не менять — прогноз через год</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-success-light rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">Накопления</p>
            <p className="font-bold text-sm text-success">{formatCurrency(yearSavings, true)}</p>
          </div>
          <div className="bg-bg-muted rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">Долги</p>
            <p className="font-bold text-sm text-text-primary">{formatCurrency(0, true)}</p>
          </div>
          <div className="bg-primary-light rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">Здоровье</p>
            <p className="font-bold text-sm text-primary">{yearHealth}</p>
          </div>
        </div>
      </div>

      {userId && (
        <>
          <CashflowWidget userId={userId} />
          <PatternsWidget userId={userId} />
        </>
      )}
    </div>
  );
};
