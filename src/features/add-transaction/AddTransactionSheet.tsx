import { useState, useEffect } from 'react';
import { Mic, Landmark, Pencil, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceCapture, parseVoiceTx } from './useVoiceCapture';
import { categoriesFor, getCategoryMeta } from '@/entities/finance/model/categoryMeta';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
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
  onConnectBank?: () => void;
  defaultDate?: string;
}

export const AddTransactionSheet = ({ open, onClose, onAdd, onConnectBank, defaultDate }: Props) => {
  const bankConnected      = useUserTxStore(s => s.bankConnected);
  const connectedBankName  = useUserTxStore(s => s.connectedBankName);
  const [mode, setMode]    = useState<AddMode>('menu');
  const voice              = useVoiceCapture();

  // ── Manual form state ──
  const [type,     setType]     = useState<TxType>('expense');
  const [amount,   setAmount]   = useState('');
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('food');
  const [method,   setMethod]   = useState<TxMethod>('cash');

  // ── Voice correction state (after recognition) ──
  const [voiceType,     setVoiceType]     = useState<TxType>('expense');
  const [voiceCategory, setVoiceCategory] = useState('other');
  const [voiceAmount,   setVoiceAmount]   = useState(0);
  const [voiceTitle,    setVoiceTitle]    = useState('');
  const [voiceParsed,   setVoiceParsed]   = useState(false);

  // Re-parse when transcript changes
  useEffect(() => {
    if (!voice.transcript) { setVoiceParsed(false); return; }
    const p = parseVoiceTx(voice.transcript);
    setVoiceType(p.type);
    setVoiceCategory(p.category);
    setVoiceAmount(p.amount);
    setVoiceTitle(p.title);
    setVoiceParsed(true);
  }, [voice.transcript]);

  const reset = () => {
    setMode('menu');
    setAmount(''); setTitle(''); setCategory('food'); setMethod('cash'); setType('expense');
    setVoiceParsed(false);
    voice.reset();
  };
  const close = () => { reset(); onClose(); };

  const saveVoice = () => {
    if (voiceAmount <= 0) return;
    onAdd({
      type: voiceType,
      amount: voiceAmount,
      category: voiceCategory,
      title: voiceTitle || getCategoryMeta(voiceCategory).label,
      method: 'cash',
      date: defaultDate,
    });
    close();
  };

  const saveManual = () => {
    const amt = Number(amount);
    if (!amt) return;
    onAdd({ type, amount: amt, category, title: title.trim() || getCategoryMeta(category).label, method, date: defaultDate });
    close();
  };

  const catMeta = getCategoryMeta(voiceCategory);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={mode === 'menu' ? 'Операции' : mode === 'voice' ? 'Голосовой ввод' : 'Вручную'}
    >
      {/* ── MENU ── */}
      {mode === 'menu' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { close(); onConnectBank?.(); }}
            className="col-span-2 flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary text-white shadow-primary active:scale-[0.98] transition-transform"
          >
            <Landmark size={24} />
            <div className="text-left">
              <p className="font-bold">{bankConnected ? 'Обновить банк' : 'Подключить банк'}</p>
              <p className="text-xs text-white/80">
                {bankConnected && connectedBankName
                  ? `${connectedBankName} · синхронизация операций`
                  : 'Автоматически загрузим операции за 3 месяца'}
              </p>
            </div>
          </button>
          <button onClick={() => setMode('voice')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-muted active:scale-[0.98] transition-transform">
            <Mic size={22} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Голосом</span>
          </button>
          <button onClick={() => setMode('manual')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-bg-muted active:scale-[0.98] transition-transform">
            <Pencil size={22} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Вручную</span>
          </button>
        </div>
      )}

      {/* ── VOICE ── */}
      {mode === 'voice' && (
        <div className="flex flex-col gap-4 py-1">
          {!voice.supported ? (
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <span className="text-4xl">{voice.notSecure ? '🔒' : '🎙️'}</span>
              <p className="text-sm font-semibold text-text-primary">
                {voice.notSecure ? 'Требуется HTTPS' : 'Браузер не поддерживает'}
              </p>
              <p className="text-sm text-text-secondary leading-snug">
                {voice.notSecure
                  ? 'Голосовой ввод работает только на HTTPS. Откройте сайт по https:// или воспользуйтесь ручным вводом.'
                  : 'Попробуйте Chrome или Safari.'}
              </p>
              <button onClick={() => setMode('manual')} className="text-sm font-semibold text-primary mt-1">
                Перейти к ручному вводу →
              </button>
            </div>
          ) : (
            <>
              {/* Кнопка микрофона */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => voice.listening ? voice.stop() : voice.start()}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    voice.listening ? 'bg-danger text-white animate-pulse' : 'bg-gradient-primary text-white shadow-primary'
                  }`}
                >
                  <Mic size={32} />
                </button>

                <p className="text-sm text-text-tertiary text-center">
                  {voice.listening
                    ? 'Говорите… например «кофе 350» или «зарплата 80000»'
                    : voice.transcript
                      ? 'Нажмите, чтобы записать заново'
                      : 'Нажмите и назовите трату или доход'}
                </p>
              </div>

              {/* Ошибка */}
              {voice.error && (
                <div className="bg-danger-light rounded-xl px-4 py-3 text-center">
                  <p className="text-sm text-danger">{voice.error}</p>
                </div>
              )}

              {/* Результат распознавания */}
              <AnimatePresence>
                {voiceParsed && !voice.error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    {/* Оригинальная фраза */}
                    <p className="text-xs text-text-tertiary text-center italic">«{voice.transcript}»</p>

                    {/* Распознанная сумма + название */}
                    <div className="bg-bg-muted rounded-2xl px-4 py-3 text-center">
                      {voiceAmount > 0 ? (
                        <>
                          <p className="text-2xl font-extrabold text-text-primary">{formatCurrency(voiceAmount)}</p>
                          {voiceTitle && voiceTitle !== 'Операция' && (
                            <p className="text-sm text-text-secondary mt-0.5">{voiceTitle}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-danger font-semibold">Сумма не распознана — скажите ещё раз</p>
                      )}
                    </div>

                    {/* Тип: расход / доход — переключатель */}
                    <div>
                      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">Тип операции</p>
                      <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
                        <button
                          onClick={() => { setVoiceType('expense'); setVoiceCategory('other'); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition-all ${
                            voiceType === 'expense' ? 'bg-danger-light text-danger shadow-sm' : 'text-text-tertiary'
                          }`}
                        >
                          <ArrowUpRight size={15} /> Расход
                        </button>
                        <button
                          onClick={() => { setVoiceType('income'); setVoiceCategory('other_inc'); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition-all ${
                            voiceType === 'income' ? 'bg-success-light text-success shadow-sm' : 'text-text-tertiary'
                          }`}
                        >
                          <ArrowDownRight size={15} /> Доход
                        </button>
                      </div>
                    </div>

                    {/* Категория — автоопределённая + выбор */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Категория</p>
                        <span className="text-xs text-text-tertiary">Автоопределено — можно поменять</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {categoriesFor(voiceType).map(c => (
                          <button
                            key={c.id}
                            onClick={() => setVoiceCategory(c.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              voiceCategory === c.id
                                ? 'ring-2 ring-primary text-text-primary shadow-sm'
                                : 'bg-bg-muted text-text-secondary'
                            }`}
                            style={voiceCategory === c.id ? { backgroundColor: c.color + '22' } : {}}
                          >
                            <span>{c.icon}</span>
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Мини-подсказка по выбранной категории */}
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-bg-muted rounded-xl">
                        <span className="text-lg">{catMeta.icon}</span>
                        <span className="text-xs text-text-secondary">
                          Добавится как <span className="font-bold text-text-primary">{catMeta.label}</span>
                          {voiceType === 'expense' ? ' · расход' : ' · доход'}
                        </span>
                      </div>
                    </div>

                    {/* Ещё раз записать */}
                    <button
                      onClick={() => { voice.reset(); setVoiceParsed(false); }}
                      className="flex items-center justify-center gap-1.5 text-sm text-text-tertiary"
                    >
                      <RefreshCw size={13} /> Записать заново
                    </button>

                    {/* Сохранить */}
                    <Button size="lg" fullWidth disabled={voiceAmount <= 0} onClick={saveVoice}>
                      Добавить {voiceType === 'income' ? 'доход' : 'расход'} · {voiceAmount > 0 ? formatCurrency(voiceAmount) : '—'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <button onClick={() => setMode('menu')} className="text-sm text-text-tertiary text-center">Назад</button>
        </div>
      )}

      {/* ── MANUAL ── */}
      {mode === 'manual' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
            {([['expense', 'Расход', ArrowUpRight], ['income', 'Доход', ArrowDownRight]] as const).map(([tp, label, Icon]) => (
              <button key={tp}
                onClick={() => { setType(tp); setCategory(tp === 'income' ? 'salary' : 'food'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold transition-all ${
                  type === tp
                    ? tp === 'expense'
                      ? 'bg-danger-light text-danger shadow-sm'
                      : 'bg-success-light text-success shadow-sm'
                    : 'text-text-tertiary'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <Input label="Сумма" type="number" inputMode="numeric" placeholder="0"
            suffix={<span className="text-sm">₽</span>}
            value={amount} onChange={e => setAmount(e.target.value)} />
          <Input label="Описание" placeholder="Например, Обед"
            value={title} onChange={e => setTitle(e.target.value)} />

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Категория</p>
            <div className="flex flex-wrap gap-2">
              {categoriesFor(type).map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-sm transition-all ${
                    category === c.id ? 'ring-2 ring-primary text-text-primary' : 'bg-bg-muted text-text-secondary'
                  }`}
                  style={category === c.id ? { backgroundColor: c.color + '22' } : {}}
                >
                  <span>{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
            {([['cash', 'Наличные'], ['card', 'Карта']] as const).map(([m, label]) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${
                  method === m ? 'bg-white shadow-card text-text-primary' : 'text-text-tertiary'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <Button size="lg" fullWidth disabled={!Number(amount)} onClick={saveManual}>
            Добавить
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
