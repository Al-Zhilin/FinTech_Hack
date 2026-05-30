import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Landmark, Loader2 } from 'lucide-react';
import { BANKS } from '@/entities/bank/model/banksMock';
import { MOCK_FINANCE } from '@/entities/finance/model/mockData';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { useUserGoalsStore } from '@/entities/goal/model/userGoalsStore';
import { useUserStore } from '@/entities/user/model/userStore';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

const CONNECTABLE_BANKS = BANKS.filter(b =>
  ['sber', 'tbank', 'alfa', 'vtb'].includes(b.id),
);

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected?: (count: number) => void;
}

export const ConnectBankSheet = ({ open, onClose, onConnected }: Props) => {
  const connectBank = useUserTxStore(s => s.connectBank);
  const bankConnected = useUserTxStore(s => s.bankConnected);
  const connectedBankName = useUserTxStore(s => s.connectedBankName);
  const updateUser = useUserStore(s => s.updateUser);
  const user = useUserStore(s => s.user);
  const { goals, addGoal } = useUserGoalsStore();

  const [phase, setPhase] = useState<'pick' | 'loading' | 'done'>('pick');
  const [pickedName, setPickedName] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => {
    setPhase('pick');
    setPickedName('');
    setImportedCount(0);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handlePick = async (bankId: string, bankName: string) => {
    setPickedName(bankName);
    setPhase('loading');

    await new Promise(r => setTimeout(r, 1400));

    const count = connectBank(bankId, bankName);

    if (user) {
      updateUser({
        ...user,
        income: user.income > 0 ? user.income : MOCK_FINANCE.monthlyIncome,
        monthlyExpenses: user.monthlyExpenses > 0 ? user.monthlyExpenses : MOCK_FINANCE.monthlySpent,
      });
    }

    if (goals.length === 0) {
      for (const g of MOCK_FINANCE.goals) {
        addGoal({
          title: g.title,
          target: g.target,
          current: g.current,
          deadline: g.deadline,
          color: g.color,
          icon: g.icon,
        });
      }
    }

    setImportedCount(count);
    setPhase('done');
    onConnected?.(count);
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={phase === 'done' ? 'Банк подключён' : 'Подключить банк'}
    >
      {phase === 'pick' && (
        <div className="flex flex-col gap-3">
          {bankConnected && connectedBankName && (
            <p className="text-xs text-text-secondary text-center mb-1">
              Сейчас подключён {connectedBankName}. Выберите банк, чтобы обновить операции.
            </p>
          )}
          <p className="text-sm text-text-secondary leading-snug mb-1">
            Выберите банк — мы подтянем операции и заполним приложение автоматически.
          </p>
          {CONNECTABLE_BANKS.map(bank => (
            <button
              key={bank.id}
              onClick={() => handlePick(bank.id, bank.name)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-bg-muted hover:bg-border-light active:scale-[0.99] transition-all"
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: bank.color }}
              >
                {bank.short}
              </span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-text-primary">{bank.name}</p>
                <p className="text-xs text-text-tertiary">Синхронизация операций</p>
              </div>
              <Landmark size={18} className="text-text-tertiary" />
            </button>
          ))}
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 size={40} className="text-primary animate-spin" />
          <p className="font-semibold text-text-primary">Подключаем {pickedName}…</p>
          <p className="text-sm text-text-tertiary text-center">Загружаем операции за 3 месяца</p>
        </div>
      )}

      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <span className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
            <Check size={32} className="text-success" />
          </span>
          <div className="text-center">
            <p className="font-bold text-lg text-text-primary">{pickedName} подключён</p>
            <p className="text-sm text-text-secondary mt-1">
              Загружено {importedCount} операций · цели и баланс обновлены
            </p>
          </div>
          <Button size="lg" fullWidth onClick={close}>Отлично</Button>
        </motion.div>
      )}
    </BottomSheet>
  );
};
