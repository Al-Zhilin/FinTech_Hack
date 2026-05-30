import { useState } from 'react';
import { Mic, Camera, QrCode, Pencil } from 'lucide-react';
import { useVoiceCapture, parseVoiceExpense } from './useVoiceCapture';
import { categoriesFor, getCategoryMeta } from '@/entities/finance/model/categoryMeta';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { formatCurrency } from '@/shared/lib/formatters';
import type { TxMethod, TxType } from '@/shared/types';

export interface NewTx {
  type: TxType;
  amount: number;
  category: string;
  title: string;
  method: TxMethod;
  date?: string;
}

type AddMode = 'menu' | 'voice' | 'manual';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (t: NewTx) => void;
  /** Дата по умолчанию (ISO) — например, выбранный день на дашборде. */
  defaultDate?: string;
}

export const AddTransactionSheet = ({ open, onClose, onAdd, defaultDate }: Props) => {
  const [mode, setMode] = useState<AddMode>('menu');
  const voice = useVoiceCapture();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('food');
  const [method, setMethod] = useState<TxMethod>('cash');

  const reset = () => { setMode('menu'); setAmount(''); setTitle(''); setCategory('food'); setMethod('cash'); setType('expense'); voice.reset(); };
  const close = () => { reset(); onClose(); };

  const parsed = parseVoiceExpense(voice.transcript);

  const saveVoice = () => {
    if (parsed.amount <= 0) return;
    onAdd({ type: 'expense', amount: parsed.amount, category: 'other', title: parsed.title, method: 'cash', date: defaultDate });
    close();
  };

  const saveManual = () => {
    const amt = Number(amount);
    if (!amt) return;
    onAdd({ type, amount: amt, category, title: title.trim() || getCategoryMeta(category).label, method, date: defaultDate });
    close();
  };

  return (
    <BottomSheet open={open} onClose={close} title={mode === 'menu' ? 'Добавить операцию' : mode === 'voice' ? 'Голосовой ввод' : 'Вручную'}>
      {mode === 'menu' && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('voice')} className="col-span-2 flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary text-white shadow-primary active:scale-[0.98] transition-transform">
            <Mic size={24} />
            <div className="text-left">
              <p className="font-bold">Голосом</p>
              <p className="text-xs text-white/80">Быстрый ввод наличных трат</p>
            </div>
          </button>
          <button onClick={() => setMode('manual')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-muted active:scale-[0.98] transition-transform">
            <Pencil size={22} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Вручную</span>
          </button>
          <button onClick={() => setMode('manual')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-muted active:scale-[0.98] transition-transform">
            <Camera size={22} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Фото чека</span>
          </button>
          <button onClick={() => setMode('manual')} className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-2xl bg-bg-muted active:scale-[0.98] transition-transform">
            <QrCode size={20} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Сканировать QR чека</span>
          </button>
          <p className="col-span-2 text-[11px] text-text-tertiary text-center">Фото и QR используют ручной ввод — распознавание скоро</p>
        </div>
      )}

      {mode === 'voice' && (
        <div className="flex flex-col items-center gap-4 py-2">
          {!voice.supported ? (
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <span className="text-4xl">{voice.notSecure ? '🔒' : '🎙️'}</span>
              <p className="text-sm font-semibold text-text-primary">
                {voice.notSecure ? 'Требуется HTTPS' : 'Браузер не поддерживает'}
              </p>
              <p className="text-sm text-text-secondary leading-snug">
                {voice.notSecure
                  ? 'Голосовой ввод работает только на защищённых сайтах (HTTPS). Откройте сайт по https:// или воспользуйтесь ручным вводом.'
                  : 'Голосовой ввод не поддерживается в этом браузере. Попробуйте Chrome или Safari.'}
              </p>
              <button onClick={() => setMode('manual')}
                className="text-sm font-semibold text-primary mt-1">
                Перейти к ручному вводу →
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => voice.listening ? voice.stop() : voice.start()}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  voice.listening
                    ? 'bg-danger text-white animate-pulse'
                    : 'bg-gradient-primary text-white shadow-primary'
                }`}
              >
                <Mic size={32} />
              </button>

              <p className="text-sm text-text-tertiary text-center">
                {voice.listening
                  ? 'Говорите… например «кофе 250»'
                  : voice.transcript
                    ? 'Нажмите ещё раз, чтобы записать заново'
                    : 'Нажмите и назовите трату'}
              </p>

              {voice.error && (
                <div className="w-full bg-danger-light rounded-xl px-4 py-3 text-center">
                  <p className="text-sm text-danger">{voice.error}</p>
                </div>
              )}

              {voice.transcript && !voice.error && (
                <div className="w-full bg-bg-muted rounded-xl p-4 text-center">
                  <p className="text-sm text-text-secondary mb-1">«{voice.transcript}»</p>
                  <p className="text-lg font-bold text-text-primary">
                    {parsed.title} — {parsed.amount > 0 ? formatCurrency(parsed.amount) : '—'}
                  </p>
                  {parsed.amount <= 0 && (
                    <p className="text-xs text-text-tertiary mt-1">Сумма не распознана — попробуйте ещё раз</p>
                  )}
                </div>
              )}

              <Button size="lg" fullWidth disabled={parsed.amount <= 0} onClick={saveVoice}>
                Добавить наличный расход
              </Button>
            </>
          )}
          <button onClick={() => setMode('menu')} className="text-sm text-text-tertiary">Назад</button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
            {([['expense', 'Расход'], ['income', 'Доход']] as const).map(([tp, label]) => (
              <button key={tp} onClick={() => { setType(tp); setCategory(tp === 'income' ? 'salary' : 'food'); }}
                className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${type === tp ? 'bg-white shadow-card text-text-primary' : 'text-text-tertiary'}`}>
                {label}
              </button>
            ))}
          </div>

          <Input label="Сумма" type="number" inputMode="numeric" placeholder="0" suffix={<span className="text-sm">₽</span>}
            value={amount} onChange={e => setAmount(e.target.value)} />
          <Input label="Описание" placeholder="Например, Обед" value={title} onChange={e => setTitle(e.target.value)} />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Категория</p>
            <div className="flex flex-wrap gap-2">
              {categoriesFor(type).map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-sm transition-all ${category === c.id ? 'bg-primary-light ring-2 ring-primary text-text-primary' : 'bg-bg-muted text-text-secondary'}`}>
                  <span>{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
            {([['cash', 'Наличные'], ['card', 'Карта']] as const).map(([m, label]) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${method === m ? 'bg-white shadow-card text-text-primary' : 'text-text-tertiary'}`}>
                {label}
              </button>
            ))}
          </div>

          <Button size="lg" fullWidth disabled={!Number(amount)} onClick={saveManual}>Добавить</Button>
        </div>
      )}
    </BottomSheet>
  );
};
