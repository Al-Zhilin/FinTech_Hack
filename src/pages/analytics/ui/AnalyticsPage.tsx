import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator, Banknote, Scale, Percent, Clock, BadgeCheck,
  TriangleAlert, ChevronRight, ShieldCheck, FileText, Landmark, Info,
} from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { BANKS } from '@/entities/bank/model/banksMock';
import { calcLoan, assessAffordability } from '@/shared/lib/loanCalc';
import { formatCurrency } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import type { Bank, BankOffer, PaymentType } from '@/shared/types';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

// ─── Slider control ────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

const Slider = ({ label, value, min, max, step, display, onChange }: SliderProps) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="text-base font-bold text-text-primary">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
        style={{ background: `linear-gradient(to right, #E8856A ${pct}%, #E5E5EA ${pct}%)` }}
      />
    </div>
  );
};

// ─── Affordability meter ───────────────────────────────────────────────────────

const AFFORD_CFG = {
  comfortable: { label: 'Комфортно', color: 'success', bar: 'bg-success', icon: BadgeCheck,
    note: 'Платёж укладывается в комфортные 30% дохода.' },
  moderate:    { label: 'Допустимо', color: 'warning', bar: 'bg-warning', icon: Info,
    note: 'Платёж ощутимый, но посильный. Следите за расходами.' },
  risky:       { label: 'Рискованно', color: 'danger', bar: 'bg-danger', icon: TriangleAlert,
    note: 'Платёж превышает безопасную долю дохода. Рассмотрите меньшую сумму или больший срок.' },
} as const;

// ─── Bank offer card ───────────────────────────────────────────────────────────

const monthsToText = (m: number) => {
  const y = Math.floor(m / 12);
  const mo = m % 12;
  const yt = y > 0 ? `${y} ${y === 1 ? 'год' : y < 5 ? 'года' : 'лет'}` : '';
  const mt = mo > 0 ? `${mo} мес.` : '';
  return [yt, mt].filter(Boolean).join(' ') || '0 мес.';
};

const BankOfferCard = ({ offer, rank, onOpen }: { offer: BankOffer; rank: number; onOpen: () => void }) => {
  const { bank, result, qualifies, affordability } = offer;
  const cfg = AFFORD_CFG[affordability];
  return (
    <button onClick={onOpen}
      className={`w-full text-left rounded-xl p-4 bg-white shadow-card border transition-all active:scale-[0.99] ${rank === 0 ? 'border-primary/40' : 'border-border-light'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: bank.color }}>
          {bank.short}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-text-primary truncate">{bank.name}</p>
            {bank.isUserBank && <Badge variant="primary">Ваш банк</Badge>}
          </div>
          <p className="text-xs text-text-tertiary">★ {bank.rating} · одобрение {bank.approvalTime}</p>
        </div>
        {rank === 0 && qualifies && <Badge variant="success">Лучшее</Badge>}
      </div>

      {qualifies ? (
        <>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs text-text-tertiary">Платёж в месяц</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(Math.round(result.monthlyPayment))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Ставка</p>
              <p className="text-base font-bold" style={{ color: bank.color }}>{result.annualRate}%</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-light text-xs">
            <span className="text-text-tertiary">Переплата: <span className="font-semibold text-text-secondary">{formatCurrency(Math.round(result.overpayment), true)}</span></span>
            <span className={`flex items-center gap-1 font-semibold text-${cfg.color}`}>
              <cfg.icon size={13} /> {cfg.label}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-tertiary py-1">
          <TriangleAlert size={15} className="text-warning" />
          Сумма или срок вне условий банка
        </div>
      )}
      <div className="flex items-center justify-end mt-2 text-xs text-primary font-medium">
        Подробнее <ChevronRight size={13} />
      </div>
    </button>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export const AnalyticsPage = () => {
  const user = useUserStore(s => s.user);
  const { profile } = useFinanceStore();

  const income = user?.income ?? profile.monthlyIncome;
  const expenses = user?.monthlyExpenses ?? profile.monthlySpent;
  const existingCredit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;

  const [amount, setAmount] = useState(500_000);
  const [months, setMonths] = useState(36);
  const [type, setType] = useState<PaymentType>('annuity');
  const [withInsurance, setWithInsurance] = useState(true);
  const [detail, setDetail] = useState<Bank | null>(null);

  // ── Compute offers across all banks ──
  const offers: BankOffer[] = useMemo(() => {
    return BANKS.map(bank => {
      const rate = withInsurance ? bank.rateFrom : bank.rateBase;
      const qualifies = amount <= bank.maxAmount && months >= bank.minTermMonths && months <= bank.maxTermMonths;
      const result = calcLoan(amount, rate, months, type);
      const aff = assessAffordability(result.monthlyPayment, income, expenses, existingCredit);
      return {
        bank,
        result,
        qualifies,
        affordability: aff.level,
        paymentToIncome: aff.paymentToIncome,
      };
    }).sort((a, b) => {
      // qualifying first, then lowest total paid
      if (a.qualifies !== b.qualifies) return a.qualifies ? -1 : 1;
      return a.result.totalPaid - b.result.totalPaid;
    });
  }, [amount, months, type, withInsurance, income, expenses, existingCredit]);

  const best = offers[0];
  const aff = best ? assessAffordability(best.result.monthlyPayment, income, expenses, existingCredit) : null;
  const freeCash = income - expenses - existingCredit;

  const detailOffer = detail ? offers.find(o => o.bank.id === detail.id) : null;

  return (
    <motion.div className="flex flex-col bg-bg-base min-h-full pb-4"
      variants={container} initial="hidden" animate="show">

      {/* ── Header ── */}
      <motion.div variants={item} className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white shadow-primary">
            <Calculator size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Кредитный калькулятор</h1>
            <p className="text-xs text-text-tertiary">Анализ предложений ваших банков</p>
          </div>
        </div>
      </motion.div>

      {/* ── Financial health ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1C1C2E] to-[#2D2D44] text-white">
          <p className="text-white/60 text-sm mb-3">Ваш финансовый поток</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-white/50 text-xs mb-0.5">Доход</p>
              <p className="font-semibold text-success">{formatCurrency(income, true)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1">
              <p className="text-white/50 text-xs mb-0.5">Расходы</p>
              <p className="font-semibold">{formatCurrency(expenses, true)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1">
              <p className="text-white/50 text-xs mb-0.5">Свободно</p>
              <p className="font-semibold text-purple">{formatCurrency(freeCash, true)}</p>
            </div>
          </div>
          {existingCredit > 0 && (
            <p className="text-xs text-white/40 mt-3">Учтены текущие кредиты: {formatCurrency(existingCredit)}/мес</p>
          )}
        </div>
      </motion.div>

      {/* ── Parameters ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <Card variant="default" padding="lg">
          <h2 className="text-base font-bold text-text-primary mb-4">Параметры кредита</h2>

          <div className="flex flex-col gap-5">
            <Slider label="Сумма кредита" value={amount} min={50_000} max={5_000_000} step={50_000}
                    display={formatCurrency(amount, true)} onChange={setAmount} />
            <Slider label="Срок" value={months} min={3} max={84} step={1}
                    display={monthsToText(months)} onChange={setMonths} />

            {/* Payment type */}
            <div>
              <span className="text-sm font-medium text-text-secondary block mb-2">Тип платежа</span>
              <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
                {([['annuity', 'Аннуитетный'], ['differentiated', 'Дифференц.']] as const).map(([t, label]) => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${type === t ? 'bg-white text-text-primary shadow-card' : 'text-text-tertiary'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Insurance toggle */}
            <button onClick={() => setWithInsurance(v => !v)}
              className="flex items-center gap-3 p-3 bg-bg-muted rounded-xl text-left">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary"><ShieldCheck size={18} /></span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-text-primary">Со страховкой</span>
                <span className="block text-xs text-text-tertiary">Снижает ставку, но добавляет платёж</span>
              </span>
              <span className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${withInsurance ? 'bg-primary' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${withInsurance ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </span>
            </button>
          </div>
        </Card>
      </motion.div>

      {/* ── Best offer + affordability ── */}
      {best && best.qualifies && aff && (
        <motion.div variants={item} className="px-5 mb-4">
          <div className="rounded-2xl p-5 bg-gradient-card-pink border border-primary/15">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Лучшее предложение</span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: best.bank.color }}>{best.bank.short}</span>
                {best.bank.name}
              </span>
            </div>

            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-xs text-text-tertiary">Платёж в месяц</p>
                <p className="text-3xl font-bold text-text-primary">{formatCurrency(Math.round(best.result.monthlyPayment))}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/60 rounded-xl p-2.5">
                <Percent size={14} className="text-primary mb-1" />
                <p className="text-xs text-text-tertiary">Ставка</p>
                <p className="text-sm font-bold text-text-primary">{best.result.annualRate}%</p>
              </div>
              <div className="bg-white/60 rounded-xl p-2.5">
                <Scale size={14} className="text-primary mb-1" />
                <p className="text-xs text-text-tertiary">Переплата</p>
                <p className="text-sm font-bold text-text-primary">{formatCurrency(Math.round(best.result.overpayment), true)}</p>
              </div>
              <div className="bg-white/60 rounded-xl p-2.5">
                <Banknote size={14} className="text-primary mb-1" />
                <p className="text-xs text-text-tertiary">Всего</p>
                <p className="text-sm font-bold text-text-primary">{formatCurrency(Math.round(best.result.totalPaid), true)}</p>
              </div>
            </div>

            {type === 'differentiated' && (
              <p className="text-xs text-text-tertiary mb-3">
                Платёж уменьшается: с {formatCurrency(Math.round(best.result.monthlyPayment))} до {formatCurrency(Math.round(best.result.lastPayment))}
              </p>
            )}

            {/* Affordability meter */}
            {(() => {
              const cfg = AFFORD_CFG[aff.level];
              const pct = Math.min(100, Math.round(aff.paymentToIncome * 100));
              return (
                <div className="bg-white/70 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`flex items-center gap-1.5 text-sm font-bold text-${cfg.color}`}>
                      <cfg.icon size={15} /> {cfg.label}
                    </span>
                    <span className="text-xs text-text-tertiary">{pct}% от дохода</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border-light overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${cfg.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-text-secondary leading-snug">{cfg.note}</p>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {/* ── Bank comparison ── */}
      <motion.div variants={item} className="px-5 mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
          <Landmark size={18} /> Сравнение банков
        </h2>
        <Badge variant="muted">{offers.filter(o => o.qualifies).length} из {offers.length}</Badge>
      </motion.div>

      <motion.div variants={item} className="px-5 flex flex-col gap-3">
        {offers.map((offer, i) => (
          <BankOfferCard key={offer.bank.id} offer={offer} rank={i} onOpen={() => setDetail(offer.bank)} />
        ))}
      </motion.div>

      {/* ── Bank detail sheet ── */}
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && detailOffer && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: detail.color }}>
                {detail.short}
              </span>
              <div>
                <p className="font-bold text-text-primary">{detail.name}</p>
                <p className="text-xs text-text-tertiary">★ {detail.rating} · одобрение {detail.approvalTime}</p>
              </div>
            </div>

            {detailOffer.qualifies ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg-muted rounded-xl p-3">
                  <p className="text-xs text-text-tertiary">Платёж/мес</p>
                  <p className="font-bold text-text-primary">{formatCurrency(Math.round(detailOffer.result.monthlyPayment))}</p>
                </div>
                <div className="bg-bg-muted rounded-xl p-3">
                  <p className="text-xs text-text-tertiary">Ставка</p>
                  <p className="font-bold text-text-primary">{detailOffer.result.annualRate}%</p>
                </div>
                <div className="bg-bg-muted rounded-xl p-3">
                  <p className="text-xs text-text-tertiary">Переплата</p>
                  <p className="font-bold text-text-primary">{formatCurrency(Math.round(detailOffer.result.overpayment))}</p>
                </div>
                <div className="bg-bg-muted rounded-xl p-3">
                  <p className="text-xs text-text-tertiary">Всего к возврату</p>
                  <p className="font-bold text-text-primary">{formatCurrency(Math.round(detailOffer.result.totalPaid))}</p>
                </div>
              </div>
            ) : (
              <div className="bg-warning-light rounded-xl p-3 flex items-center gap-2 text-sm text-warning font-medium">
                <TriangleAlert size={16} />
                Запрошенная сумма/срок вне условий: до {formatCurrency(detail.maxAmount, true)}, {detail.minTermMonths}–{detail.maxTermMonths} мес.
              </div>
            )}

            {/* Conditions */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Условия и нюансы</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={15} className="text-text-tertiary" />
                  <span className="text-text-secondary">{detail.requiresIncomeProof ? 'Нужна справка о доходах' : 'Без справок о доходах'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck size={15} className="text-text-tertiary" />
                  <span className="text-text-secondary">{detail.insuranceAvailable ? 'Страховка снижает ставку' : 'Без страхования'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={15} className="text-text-tertiary" />
                  <span className="text-text-secondary">Досрочное погашение {detail.earlyRepaymentFree ? 'без комиссии' : 'с комиссией в начале срока'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Преимущества</p>
              <ul className="flex flex-col gap-1.5">
                {detail.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <BadgeCheck size={15} className="text-success mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-text-tertiary text-center">
              Расчёт предварительный. Итоговые условия определяет банк.
            </p>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};
