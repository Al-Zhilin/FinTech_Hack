import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import mascotImg from '@/assets/mascot-advisor.png';
import { MascotAdvisor } from '@/shared/ui/MascotAdvisor';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { formatCurrency } from '@/shared/lib/formatters';
import { evaluateImpulsePurchase } from '@/entities/finance/model/impulseCheck';
import type { SafeSpendResult } from '@/entities/finance/model/safeToSpend';
import type { Goal, User } from '@/shared/types';
import type { GoalFinance } from '@/entities/goal/model/goalAnalysis';

const VERDICT_CFG = {
  ok: { label: 'Можно, но подумай', cls: 'text-success bg-success-light' },
  caution: { label: 'Осторожно', cls: 'text-warning bg-warning-light' },
  danger: { label: 'Лучше подождать', cls: 'text-danger bg-danger-light' },
};

interface Props {
  safeSpend: SafeSpendResult;
  user: User | null;
  goals: Goal[];
  finance: GoalFinance;
}

export const ImpulseCheckSheet = ({ safeSpend, user, goals, finance }: Props) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [checked, setChecked] = useState(false);

  const parsed = Number(amount.replace(/\s/g, '').replace(',', '.'));
  const result = useMemo(
    () => checked && parsed > 0
      ? evaluateImpulsePurchase(parsed, title, user, safeSpend, goals, finance)
      : null,
    [checked, parsed, title, user, safeSpend, goals, finance],
  );

  const reset = () => {
    setAmount('');
    setTitle('');
    setChecked(false);
  };

  const handleCheck = () => {
    if (!parsed || parsed <= 0) return;
    setChecked(true);
  };

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="w-full flex items-center gap-3 bg-gradient-card-purple rounded-2xl p-4 border border-purple/15 active:scale-[0.99] transition-transform"
      >
        <span className="w-11 h-11 rounded-xl bg-purple/15 flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={22} className="text-purple" />
        </span>
        <div className="flex-1 text-left">
          <p className="font-bold text-sm text-text-primary">Хочу купить!</p>
          <p className="text-xs text-text-tertiary">Проверить покупку перед оплатой</p>
        </div>
        <img
          src={mascotImg}
          alt=""
          className="w-12 h-12 object-contain flex-shrink-0"
        />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Проверка покупки">
        <div className="flex flex-col gap-4">
          <MascotAdvisor>
            <p className="text-sm text-text-secondary leading-snug">
              Расскажи, что хочешь купить — переведу сумму на понятный язык, без морали.
            </p>
          </MascotAdvisor>

          <Input
            label="Название (необязательно)"
            placeholder="Например, новые кроссовки"
            value={title}
            onChange={e => { setTitle(e.target.value); setChecked(false); }}
          />
          <Input
            label="Сумма, ₽"
            type="number"
            placeholder="10 000"
            value={amount}
            onChange={e => { setAmount(e.target.value); setChecked(false); }}
          />

          {!result ? (
            <Button size="lg" fullWidth disabled={!parsed || parsed <= 0} onClick={handleCheck}>
              Проверить
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <span className={`self-start text-xs font-bold px-2.5 py-1 rounded-full ${VERDICT_CFG[result.verdict].cls}`}>
                {VERDICT_CFG[result.verdict].label}
              </span>
              <MascotAdvisor size="sm">
                <div className="flex flex-col gap-2">
                  {result.messages.map((msg, i) => (
                    <p key={i} className="text-sm text-text-secondary leading-snug">{msg}</p>
                  ))}
                </div>
              </MascotAdvisor>
              <p className="text-xs text-text-tertiary text-center">
                После покупки останется {formatCurrency(Math.max(0, result.safeAfterPurchase), true)} безопасного бюджета
              </p>
              <Button size="lg" fullWidth variant="secondary" onClick={() => { reset(); setOpen(false); }}>
                Понятно, спасибо
              </Button>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
};
