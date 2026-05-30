import { motion } from 'framer-motion';
import { Wallet, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatters';
import type { SafeSpendResult } from '@/entities/finance/model/safeToSpend';
import { useState } from 'react';

interface Props {
  data: SafeSpendResult;
}

export const SafeSpendIndicator = ({ data }: Props) => {
  const [open, setOpen] = useState(false);
  const { totalBalance, safeAmount, reserved, upcoming } = data;

  return (
    <div className="rounded-2xl bg-white shadow-card p-4 border border-border-light">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[11px] text-text-tertiary font-medium mb-0.5">Общий баланс</p>
          <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="rounded-xl bg-success-light px-3 py-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Wallet size={13} className="text-success" />
            <p className="text-[11px] text-success font-semibold">Безопасно потратить</p>
          </div>
          <p className="text-xl font-bold text-success">{formatCurrency(safeAmount)}</p>
        </div>
      </div>

      <p className="text-xs text-text-secondary leading-snug mb-2">
        Уже зарезервировано на обязательные платежи и цели этого месяца
      </p>

      {(reserved.mandatory + reserved.credit + reserved.goals) > 0 && (
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-primary py-1"
        >
          <span>
            Зарезервировано {formatCurrency(reserved.mandatory + reserved.credit + reserved.goals, true)}
          </span>
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 pt-2 border-t border-border-light flex flex-col gap-1.5"
        >
          {reserved.mandatory > 0 && (
            <Row label="Обязательные (аренда, подписки)" value={reserved.mandatory} />
          )}
          {reserved.credit > 0 && <Row label="Кредит" value={reserved.credit} />}
          {reserved.goals > 0 && <Row label="Цели этого месяца" value={reserved.goals} />}
          {upcoming.map(u => (
            <p key={u.label} className="text-[11px] text-text-tertiary">
              · {u.label} — {formatCurrency(u.amount, true)} через {u.daysUntil} дн.
            </p>
          ))}
        </motion.div>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between text-xs">
    <span className="text-text-secondary">{label}</span>
    <span className="font-semibold text-text-primary">{formatCurrency(value, true)}</span>
  </div>
);
