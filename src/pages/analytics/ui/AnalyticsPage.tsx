import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Banknote, Scale, Percent, Clock, BadgeCheck,
  TriangleAlert, ChevronRight, ShieldCheck, FileText, Landmark, Info,
  Sparkles, TrendingDown, Zap, AlertCircle, CheckCircle2, HelpCircle,
  ChevronDown, ArrowRight,
} from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { BANKS } from '@/entities/bank/model/banksMock';
import {
  PRODUCTS, getProduct, effectiveRate, type ProductId,
} from '@/entities/bank/model/creditProducts';
import {
  calcLoan, assessAffordability, maxAffordablePrincipal,
  calcRefinance, calcEarlyRepayment, calcAnnuity,
} from '@/shared/lib/loanCalc';
import { formatCurrency } from '@/shared/lib/formatters';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { AskAiButton } from '@/features/ask-ai';
import type { Bank, BankOffer, PaymentType } from '@/shared/types';

const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const monthsToText = (m: number) => {
  const y = Math.floor(m / 12);
  const mo = m % 12;
  const yt = y > 0 ? `${y} ${y === 1 ? 'год' : y < 5 ? 'года' : 'лет'}` : '';
  const mt = mo > 0 ? `${mo} мес.` : '';
  return [yt, mt].filter(Boolean).join(' ') || '0 мес.';
};

// ─── Slider with hint ─────────────────────────────────────────────────────────
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  hint?: string;
  hintType?: 'info' | 'warn' | 'good';
  onChange: (v: number) => void;
}

const Slider = ({ label, value, min, max, step, display, hint, hintType = 'info', onChange }: SliderProps) => {
  const pct = ((value - min) / (max - min)) * 100;
  const hintColors = {
    info: 'text-text-tertiary bg-bg-muted',
    warn: 'text-warning bg-warning-light',
    good: 'text-success bg-success-light',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-text-secondary">{label}</span>
        <span className="text-base font-extrabold text-text-primary">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary mb-2"
        style={{ background: `linear-gradient(to right, #E8856A ${pct}%, #E5E5EA ${pct}%)` }}
      />
      {hint && (
        <motion.p
          key={hint}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-[11px] font-medium px-2 py-1 rounded-lg ${hintColors[hintType]}`}
        >
          {hint}
        </motion.p>
      )}
    </div>
  );
};

// ─── Info tooltip toggle ──────────────────────────────────────────────────────
const InfoTip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button onClick={() => setShow(v => !v)} className="text-text-tertiary hover:text-primary transition-colors">
        <HelpCircle size={14} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-6 left-0 z-20 w-64 bg-text-primary text-white text-xs rounded-2xl px-3 py-2.5 shadow-lg leading-relaxed"
          >
            {text}
            <div className="absolute -bottom-1.5 left-2 w-3 h-3 bg-text-primary rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

// ─── Payment donut chart (principal vs interest) ───────────────────────────────
const PaymentDonut = ({ principal, overpayment }: { principal: number; overpayment: number }) => {
  const total    = principal + overpayment;
  const pct = total > 0 ? Math.round((principal / total) * 100) : 100;
  const r        = 28;
  const circ     = 2 * Math.PI * r;
  const dash     = (pct / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#FFE4DC" strokeWidth="8" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E8856A" strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-extrabold text-text-primary">{pct}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
          <span className="text-text-secondary">Тело кредита</span>
          <span className="font-bold text-text-primary ml-auto">{formatCurrency(principal, true)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary/25 flex-shrink-0" />
          <span className="text-text-secondary">Переплата %</span>
          <span className="font-bold text-danger ml-auto">{formatCurrency(overpayment, true)}</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border-light">
          <span className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="text-text-tertiary">Итого</span>
          <span className="font-bold text-text-primary ml-auto">{formatCurrency(principal + overpayment, true)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Amortization preview ──────────────────────────────────────────────────────
const AmortizationPreview = ({ principal, annualRate, months }: { principal: number; annualRate: number; months: number }) => {
  const r        = annualRate / 100 / 12;
  const payment  = calcAnnuity(principal, annualRate, months).monthlyPayment;
  const preview  = [1, Math.ceil(months / 2), months].map(m => {
    const rem      = r > 0
      ? principal * Math.pow(1 + r, m - 1) - payment * (Math.pow(1 + r, m - 1) - 1) / r
      : principal - (payment * (m - 1));
    const interest  = Math.max(0, rem) * r;
    const body      = Math.min(payment - interest, rem);
    return { m, interest: Math.round(interest), body: Math.round(body), remaining: Math.max(0, Math.round(rem - body)) };
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide">Как меняется платёж со временем</p>
      {preview.map(({ m, interest, body }) => (
        <div key={m} className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-text-tertiary w-14 flex-shrink-0">
            {m === 1 ? '1-й мес.' : m === months ? 'последний' : `${m}-й мес.`}
          </span>
          <div className="flex-1 flex h-5 rounded-full overflow-hidden bg-border-light">
            <div className="bg-primary h-full" style={{ width: `${Math.round((body / (interest + body)) * 100)}%` }} />
            <div className="bg-danger/40 h-full" style={{ width: `${Math.round((interest / (interest + body)) * 100)}%` }} />
          </div>
          <div className="text-[11px] text-right w-24 flex-shrink-0">
            <span className="text-primary font-bold">{formatCurrency(body, true)}</span>
            <span className="text-text-tertiary"> + </span>
            <span className="text-danger font-semibold">{formatCurrency(interest, true)}</span>
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-[10px] text-text-tertiary mt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> тело</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger/40 inline-block" /> проценты</span>
        {preview[2].remaining > 0 && <span className="ml-auto">Остаток после: {formatCurrency(preview[2].remaining, true)}</span>}
      </div>
    </div>
  );
};

// ─── Scenario comparison ──────────────────────────────────────────────────────
const ScenarioCompare = ({
  label1, payment1, total1, months1,
  label2, payment2, total2, months2,
}: {
  label1: string; payment1: number; total1: number; months1: number;
  label2: string; payment2: number; total2: number; months2: number;
}) => {
  const saving = total1 - total2;
  const better = saving > 0 ? 2 : saving < 0 ? 1 : 0;
  return (
    <div>
      <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">А что если…</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: label1, payment: payment1, total: total1, months: months1, win: better === 1 },
          { label: label2, payment: payment2, total: total2, months: months2, win: better === 2 },
        ].map(s => (
          <div key={s.label}
            className={`rounded-xl p-3 text-center border transition-all ${s.win ? 'border-success bg-success-light' : 'border-border-light bg-bg-muted'}`}>
            <p className="text-[11px] font-bold text-text-secondary mb-1">{s.label}</p>
            <p className="text-base font-extrabold text-text-primary">{formatCurrency(s.payment, true)}/мес</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">всего {formatCurrency(s.total, true)}</p>
            {s.win && <span className="text-[10px] font-extrabold text-success">✓ выгоднее</span>}
          </div>
        ))}
      </div>
      {saving !== 0 && (
        <p className={`text-xs font-semibold mt-2 text-center ${saving > 0 ? 'text-success' : 'text-danger'}`}>
          {saving > 0
            ? `Вариант «${label2}» сэкономит ${formatCurrency(Math.abs(saving), true)}`
            : `Вариант «${label1}» сэкономит ${formatCurrency(Math.abs(saving), true)}`}
        </p>
      )}
    </div>
  );
};

// ─── Red flags ────────────────────────────────────────────────────────────────
interface Flag { type: 'warn' | 'info' | 'ok'; text: string }

const FlagBadge = ({ flag }: { flag: Flag }) => {
  const styles = {
    warn: { bg: 'bg-danger-light', text: 'text-danger', icon: <AlertCircle size={13} className="text-danger" /> },
    info: { bg: 'bg-warning-light', text: 'text-warning', icon: <Info size={13} className="text-warning" /> },
    ok:   { bg: 'bg-success-light', text: 'text-success', icon: <CheckCircle2 size={13} className="text-success" /> },
  };
  const s = styles[flag.type];
  return (
    <div className={`flex items-start gap-2 ${s.bg} rounded-xl px-3 py-2`}>
      <span className="flex-shrink-0 mt-0.5">{s.icon}</span>
      <p className={`text-[12px] font-semibold leading-snug ${s.text}`}>{flag.text}</p>
    </div>
  );
};

// ─── Affordability config ─────────────────────────────────────────────────────
const AFFORD_CFG = {
  comfortable: { label: 'Комфортно', color: 'success', bar: 'bg-success', icon: BadgeCheck,
    note: 'Платёж ≤ 30% дохода — безопасная зона.' },
  moderate:    { label: 'Допустимо', color: 'warning', bar: 'bg-warning', icon: Info,
    note: 'Нагрузка ощутимая, но справитесь. Сохраняйте запас.' },
  risky:       { label: 'Рискованно', color: 'danger', bar: 'bg-danger', icon: TriangleAlert,
    note: 'Платёж превышает безопасную долю. Снизьте сумму или увеличьте срок.' },
} as const;

// ─── Bank offer card ──────────────────────────────────────────────────────────
const BankOfferCard = ({ offer, rank, onOpen }: { offer: BankOffer; rank: number; onOpen: () => void }) => {
  const { bank, result, qualifies, affordability } = offer;
  const cfg = AFFORD_CFG[affordability];
  return (
    <button onClick={onOpen}
      className={`w-full text-left rounded-2xl p-4 bg-white shadow-card border transition-all active:scale-[0.99] ${rank === 0 && qualifies ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border-light'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
              style={{ backgroundColor: bank.color }}>
          {bank.short}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-text-primary truncate">{bank.name}</p>
            {bank.isUserBank && <Badge variant="primary">Ваш банк</Badge>}
          </div>
          <p className="text-xs text-text-tertiary">★ {bank.rating} · одобрение {bank.approvalTime}</p>
        </div>
        {rank === 0 && qualifies && <Badge variant="success">Лучшее</Badge>}
      </div>

      {qualifies ? (
        <>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-text-tertiary">Платёж / мес.</p>
              <p className="text-2xl font-extrabold text-text-primary">{formatCurrency(Math.round(result.monthlyPayment))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Ставка</p>
              <p className="text-lg font-extrabold" style={{ color: bank.color }}>{result.annualRate}%</p>
            </div>
          </div>
          {/* Мини-бар переплаты */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] text-text-tertiary mb-1">
              <span>Тело: {formatCurrency(result.principal, true)}</span>
              <span>Переплата: {formatCurrency(Math.round(result.overpayment), true)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-border-light overflow-hidden">
              <div className="h-full bg-primary rounded-full"
                   style={{ width: `${Math.round(result.principal / result.totalPaid * 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-light text-xs">
            <span className={`flex items-center gap-1 font-semibold text-${cfg.color}`}>
              <cfg.icon size={13} /> {cfg.label}
            </span>
            <span className="text-text-tertiary">Всего: {formatCurrency(Math.round(result.totalPaid), true)}</span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-tertiary py-1">
          <TriangleAlert size={15} className="text-warning flex-shrink-0" />
          <span>Сумма/срок вне условий банка (до {formatCurrency(bank.maxAmount, true)})</span>
        </div>
      )}
      <div className="flex items-center justify-end mt-2 text-xs text-primary font-semibold">
        Подробнее <ChevronRight size={13} />
      </div>
    </button>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const AnalyticsPage = () => {
  const user = useUserStore(s => s.user);
  const { profile } = useFinanceStore();

  const income         = user?.income ?? profile.monthlyIncome;
  const expenses       = user?.monthlyExpenses ?? profile.monthlySpent;
  const existingCredit = user?.hasCredits ? (user.creditAmount ?? 0) : 0;
  const freeCash       = income - expenses - existingCredit;

  const [product, setProduct]           = useState<ProductId>('consumer');
  const cfg = getProduct(product);

  const [amount,        setAmount]        = useState(500_000);
  const [price,         setPrice]         = useState(6_000_000);
  const [downPct,       setDownPct]       = useState(20);
  const [months,        setMonths]        = useState(36);
  const [type,          setType]          = useState<PaymentType>('annuity');
  const [withInsurance, setWithInsurance] = useState(true);
  const [detail,        setDetail]        = useState<Bank | null>(null);
  const [showAmort,     setShowAmort]     = useState(false);

  const [rfBalance, setRfBalance] = useState(800_000);
  const [rfRate,    setRfRate]    = useState(28);
  const [rfMonths,  setRfMonths]  = useState(36);

  const [epBalance, setEpBalance] = useState(600_000);
  const [epRate,    setEpRate]    = useState(24);
  const [epMonths,  setEpMonths]  = useState(48);
  const [epExtra,   setEpExtra]   = useState(10_000);

  const isBorrow       = product === 'consumer' || product === 'mortgage' || product === 'auto';
  const hasDownPayment = product === 'mortgage' || product === 'auto';

  const principal = useMemo(() => {
    if (product === 'consumer') return amount;
    if (hasDownPayment) return Math.round(price * (1 - downPct / 100));
    return amount;
  }, [product, amount, price, downPct, hasDownPayment]);

  const term = Math.min(Math.max(months, cfg.termMin), cfg.termMax);

  const offers: BankOffer[] = useMemo(() => {
    return BANKS.map(bank => {
      const rate      = effectiveRate(bank, cfg, withInsurance);
      const qualifies = principal <= bank.maxAmount && term >= bank.minTermMonths && term <= cfg.termMax;
      const result    = calcLoan(principal, rate, term, type);
      result.annualRate = rate;
      const aff = assessAffordability(result.monthlyPayment, income, expenses, existingCredit);
      return { bank, result, qualifies, affordability: aff.level, paymentToIncome: aff.paymentToIncome };
    }).sort((a, b) => {
      if (a.qualifies !== b.qualifies) return a.qualifies ? -1 : 1;
      return a.result.totalPaid - b.result.totalPaid;
    });
  }, [principal, term, type, withInsurance, income, expenses, existingCredit, cfg]);

  const best        = offers[0];
  const aff         = best ? assessAffordability(best.result.monthlyPayment, income, expenses, existingCredit) : null;
  const detailOffer = detail ? offers.find(o => o.bank.id === detail.id) : null;

  const bestRate = useMemo(
    () => Math.min(...BANKS.map(b => effectiveRate(b, cfg, withInsurance))),
    [cfg, withInsurance],
  );
  const maxLoan = maxAffordablePrincipal(income, expenses, existingCredit, bestRate, term);

  // Сравнение сценариев: текущий срок vs +12 и -12 месяцев
  const altShort = term - 12 >= cfg.termMin
    ? calcLoan(principal, bestRate, term - 12, type) : null;
  const altLong  = term + 12 <= cfg.termMax
    ? calcLoan(principal, bestRate, term + 12, type) : null;
  const curResult = best?.qualifies ? best.result : calcLoan(principal, bestRate, term, type);

  // Флаги-предупреждения
  const flags: Flag[] = useMemo(() => {
    const f: Flag[] = [];
    if (!best || !aff) return f;
    const rate = best.result.annualRate;
    const overPct = Math.round((best.result.overpayment / principal) * 100);

    if (rate >= 25) f.push({ type: 'warn', text: `Ставка ${rate}% — очень высокая. Итоговая переплата ${overPct}% от суммы.` });
    else if (rate >= 18) f.push({ type: 'info', text: `Ставка ${rate}% — выше среднего. Рассмотрите рефинансирование через 6–12 месяцев.` });

    if (term > 60 && product === 'consumer') f.push({ type: 'warn', text: `Срок ${monthsToText(term)} — долго для потребкредита. Переплата растёт экспоненциально.` });

    if (aff.level === 'risky') f.push({ type: 'warn', text: `Платёж ${Math.round(aff.paymentToIncome * 100)}% дохода — рискованно. Банки часто отказывают при нагрузке >50%.` });
    else if (aff.level === 'comfortable') f.push({ type: 'ok', text: `Платёж ${Math.round(aff.paymentToIncome * 100)}% дохода — комфортно. Хороший шанс одобрения.` });

    if (!withInsurance) f.push({ type: 'info', text: 'Без страховки ставка выше. Иногда страховка выгоднее из-за снижения ставки.' });
    if (hasDownPayment && downPct < 20) f.push({ type: 'info', text: `Первый взнос ${downPct}% — мало. При ≥20% банки дают лучшую ставку и одобряют охотнее.` });
    if (principal > 0 && maxLoan.principal > 0 && principal > maxLoan.principal * 1.3) {
      f.push({ type: 'warn', text: `Запрошено ${formatCurrency(principal, true)}, а комфортный максимум для вас — ${formatCurrency(maxLoan.principal, true)}.` });
    }
    return f;
  }, [best, aff, principal, term, product, withInsurance, hasDownPayment, downPct, maxLoan]);

  // Динамические подсказки к слайдерам
  const amountHint = () => {
    if (!income) return undefined;
    const incomeRatio = Math.round(principal / income);
    if (incomeRatio <= 3)  return { text: `≈ ${incomeRatio} месячных зарплаты — небольшой кредит`, type: 'good' as const };
    if (incomeRatio <= 6)  return { text: `≈ ${incomeRatio} месячных зарплаты — умеренная сумма`, type: 'info' as const };
    return { text: `≈ ${incomeRatio} месячных зарплат — значительная сумма, рассчитывайте нагрузку`, type: 'warn' as const };
  };
  const termHint = () => {
    if (!best?.qualifies) return undefined;
    const ovPct = Math.round((best.result.overpayment / principal) * 100);
    if (term <= 12) return { text: `Короткий срок — переплата минимальна (${ovPct}%)`, type: 'good' as const };
    if (term <= 36) return { text: `Оптимальный срок — переплата ${ovPct}% от суммы`, type: 'info' as const };
    return { text: `Длинный срок — переплата ${ovPct}%. Чем короче — тем выгоднее`, type: 'warn' as const };
  };
  const downHint = () => {
    if (downPct >= 30) return { text: 'Большой взнос — минимальная переплата и лучшие условия', type: 'good' as const };
    if (downPct >= 20) return { text: 'Хороший взнос — банки одобряют охотно', type: 'info' as const };
    return { text: 'Малый взнос увеличивает риск и ставку. Рекомендуем от 20%', type: 'warn' as const };
  };

  const rfBestRate = useMemo(() => Math.min(...BANKS.map(b => effectiveRate(b, getProduct('refinance'), true))), []);
  const refi  = calcRefinance(rfBalance, rfRate, rfBestRate, rfMonths);
  const early = calcEarlyRepayment(epBalance, epRate, epMonths, epExtra);

  return (
    <motion.div className="flex flex-col bg-bg-base min-h-full pb-8"
      variants={container} initial="hidden" animate="show">

      {/* ── Шапка ── */}
      <motion.div variants={item} className="px-5 pt-12 md:pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-primary">
            <Calculator size={22} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-text-primary">Кредитный калькулятор</h1>
            <p className="text-xs text-text-tertiary">Расчёт с учётом ваших доходов и расходов</p>
          </div>
        </div>
      </motion.div>

      {/* ── Продукт ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
          {PRODUCTS.map(p => (
            <button
              key={p.id}
              onClick={() => { setProduct(p.id); setMonths(m => Math.min(Math.max(m, p.termMin), p.termMax)); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 h-10 rounded-xl text-sm font-bold transition-all ${
                product === p.id ? 'bg-gradient-primary text-white shadow-primary' : 'bg-white text-text-secondary border border-border shadow-card'
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Финансовый поток ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1C1C2E] to-[#2D2D44] text-white">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">Ваш финансовый поток</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-white/50 text-[11px] mb-0.5">Доход</p>
              <p className="font-extrabold text-success text-sm">{formatCurrency(income, true)}</p>
            </div>
            <div>
              <p className="text-white/50 text-[11px] mb-0.5">Расходы</p>
              <p className="font-extrabold text-sm">{formatCurrency(expenses, true)}</p>
            </div>
            <div>
              <p className="text-white/50 text-[11px] mb-0.5">Свободно</p>
              <p className={`font-extrabold text-sm ${freeCash > 0 ? 'text-purple' : 'text-danger'}`}>{formatCurrency(freeCash, true)}</p>
            </div>
          </div>
          {existingCredit > 0 && (
            <p className="text-xs text-white/40 mt-2 pt-2 border-t border-white/10">
              Учтены текущие кредиты: {formatCurrency(existingCredit)}/мес
            </p>
          )}
        </div>
      </motion.div>

      {/* ── «Доступно вам» ── */}
      {isBorrow && maxLoan.principal > 0 && (
        <motion.div variants={item} className="px-5 mb-4">
          <div className="rounded-2xl p-4 bg-gradient-card-purple border border-purple/15">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-purple" />
              <span className="text-xs font-extrabold text-purple uppercase tracking-wide">Комфортный максимум для вас</span>
              <InfoTip text="Максимальная сумма кредита при которой ежемесячный платёж не превысит 30% вашего дохода — безопасная зона по стандартам банков." />
            </div>
            <p className="text-3xl font-extrabold text-text-primary mb-0.5">
              {formatCurrency(maxLoan.principal)}
            </p>
            <p className="text-xs text-text-secondary mb-3">
              При платеже {formatCurrency(Math.round(maxLoan.comfortablePayment), true)}/мес · ставке {bestRate}% · {monthsToText(term)}
            </p>
            <button
              onClick={() => {
                if (hasDownPayment) setPrice(Math.round(maxLoan.principal / (1 - downPct / 100) / 100_000) * 100_000);
                else setAmount(Math.min(5_000_000, Math.round(maxLoan.principal / 50_000) * 50_000));
              }}
              className="flex items-center gap-1 text-sm font-bold text-purple"
            >
              Подставить эту сумму <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── КРЕДИТ: параметры + анализ ── */}
      {isBorrow && (
        <>
          {/* Параметры */}
          <motion.div variants={item} className="px-5 mb-4">
            <Card variant="default" padding="lg">
              <h2 className="text-base font-extrabold text-text-primary mb-4 flex items-center gap-2">
                Параметры {cfg.label.toLowerCase()}
                <InfoTip text={`${cfg.label}: ставка от ${cfg.rateFloor}%, срок ${monthsToText(cfg.termMin)}–${monthsToText(cfg.termMax)}`} />
              </h2>
              <div className="flex flex-col gap-5">

                {hasDownPayment ? (
                  <>
                    <Slider
                      label={product === 'mortgage' ? 'Стоимость жилья' : 'Стоимость авто'}
                      value={price}
                      min={product === 'mortgage' ? 1_000_000 : 300_000}
                      max={product === 'mortgage' ? 30_000_000 : 10_000_000}
                      step={product === 'mortgage' ? 100_000 : 50_000}
                      display={formatCurrency(price, true)}
                      onChange={setPrice}
                    />
                    <Slider
                      label={`Первый взнос · ${downPct}% · ${formatCurrency(Math.round(price * downPct / 100), true)}`}
                      value={downPct}
                      min={product === 'mortgage' ? 10 : 0}
                      max={90} step={5}
                      display={`${downPct}%`}
                      {...downHint()}
                      onChange={setDownPct}
                    />
                    <div className="flex items-center justify-between bg-bg-muted rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-text-secondary">Сумма кредита</span>
                      <span className="font-extrabold text-text-primary">{formatCurrency(principal)}</span>
                    </div>
                  </>
                ) : (
                  <Slider
                    label="Сумма кредита"
                    value={amount} min={50_000} max={5_000_000} step={50_000}
                    display={formatCurrency(amount, true)}
                    {...amountHint()}
                    onChange={setAmount}
                  />
                )}

                <Slider
                  label="Срок"
                  value={term} min={cfg.termMin} max={cfg.termMax} step={1}
                  display={monthsToText(term)}
                  {...termHint()}
                  onChange={setMonths}
                />

                {/* Тип платежа */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-text-secondary">Тип платежа</span>
                    <InfoTip text="Аннуитетный — равные платежи весь срок (удобно планировать). Дифференцированный — платежи убывают, первый выше, суммарная переплата меньше." />
                  </div>
                  <div className="flex gap-2 p-1 bg-bg-muted rounded-xl">
                    {([['annuity', 'Аннуитетный'], ['differentiated', 'Дифференц.']] as const).map(([t, label]) => (
                      <button key={t} onClick={() => setType(t)}
                        className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all ${type === t ? 'bg-white text-text-primary shadow-card' : 'text-text-tertiary'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {type === 'differentiated' && (
                    <p className="text-[11px] text-success mt-1.5 px-1">
                      ✓ Дифференцированный выгоднее аннуитетного: меньше переплата, но первый платёж выше.
                    </p>
                  )}
                </div>

                {/* Страховка */}
                <button onClick={() => setWithInsurance(v => !v)}
                  className="flex items-center gap-3 p-3 bg-bg-muted rounded-xl text-left">
                  <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary shadow-card">
                    <ShieldCheck size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-text-primary">Со страховкой</span>
                    <span className="block text-[11px] text-text-tertiary leading-tight">
                      Снижает ставку — иногда итоговая переплата меньше
                    </span>
                  </div>
                  <span className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${withInsurance ? 'bg-primary' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${withInsurance ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </span>
                </button>
              </div>
            </Card>
          </motion.div>

          {/* Итоговая карточка лучшего предложения */}
          {best && best.qualifies && aff && (
            <motion.div variants={item} className="px-5 mb-4">
              <div className="rounded-2xl p-5 bg-gradient-card-pink border border-primary/15">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wide">Лучшее предложение</span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-extrabold" style={{ backgroundColor: best.bank.color }}>{best.bank.short}</span>
                    {best.bank.name}
                  </span>
                </div>

                {/* Главная цифра */}
                <div className="mb-4">
                  <p className="text-xs text-text-tertiary">Платёж в месяц</p>
                  <p className="text-4xl font-extrabold text-text-primary">{formatCurrency(Math.round(best.result.monthlyPayment))}</p>
                  {type === 'differentiated' && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Убывает: с {formatCurrency(Math.round(best.result.monthlyPayment))} до {formatCurrency(Math.round(best.result.lastPayment))}
                    </p>
                  )}
                </div>

                {/* 4 ячейки */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { icon: <Percent size={13} />, label: 'Ставка', val: `${best.result.annualRate}%` },
                    { icon: <Clock size={13} />, label: 'Срок', val: monthsToText(term) },
                    { icon: <Scale size={13} />, label: 'Переплата', val: formatCurrency(Math.round(best.result.overpayment), true) },
                    { icon: <Banknote size={13} />, label: 'Всего вернёте', val: formatCurrency(Math.round(best.result.totalPaid), true) },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="bg-white/60 rounded-xl p-2.5">
                      <div className="flex items-center gap-1 text-primary mb-0.5">{icon}<span className="text-[10px] text-text-tertiary">{label}</span></div>
                      <p className="text-sm font-extrabold text-text-primary">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Пончик-разбивщик */}
                <div className="bg-white/70 rounded-xl p-3 mb-4">
                  <p className="text-xs font-bold text-text-secondary mb-3">Структура итоговой суммы</p>
                  <PaymentDonut principal={best.result.principal} overpayment={best.result.overpayment} />
                </div>

                {/* Нагрузка */}
                {(() => {
                  const c   = AFFORD_CFG[aff.level];
                  const pct = Math.min(100, Math.round(aff.paymentToIncome * 100));
                  return (
                    <div className="bg-white/70 rounded-xl p-3 mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`flex items-center gap-1 text-sm font-bold text-${c.color}`}>
                          <c.icon size={14} /> {c.label}
                        </span>
                        <span className="text-xs text-text-tertiary">{pct}% от дохода</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-border-light overflow-hidden mb-1.5">
                        <motion.div
                          className={`h-full rounded-full ${c.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[11px] text-text-secondary leading-snug">{c.note}</p>
                    </div>
                  );
                })()}

                {/* Флаги предупреждений */}
                {flags.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-4">
                    {flags.map((f, i) => <FlagBadge key={i} flag={f} />)}
                  </div>
                )}

                {/* Амортизация */}
                <button
                  onClick={() => setShowAmort(v => !v)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-primary py-2 border-t border-primary/15"
                >
                  <span>📊 График погашения</span>
                  <ChevronDown size={16} className={`transition-transform ${showAmort ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showAmort && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="pt-3">
                        <AmortizationPreview principal={principal} annualRate={best.result.annualRate} months={term} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Сравнение сценариев */}
                {(altShort || altLong) && (
                  <div className="mt-4 pt-4 border-t border-primary/15">
                    <ScenarioCompare
                      label1={`${monthsToText(term)} (текущий)`}
                      payment1={Math.round(curResult.monthlyPayment)}
                      total1={Math.round(curResult.totalPaid)}
                      months1={term}
                      label2={altShort
                        ? `На ${monthsToText(12)} короче`
                        : `На ${monthsToText(12)} длиннее`}
                      payment2={altShort
                        ? Math.round(altShort.monthlyPayment)
                        : Math.round(altLong!.monthlyPayment)}
                      total2={altShort
                        ? Math.round(altShort.totalPaid)
                        : Math.round(altLong!.totalPaid)}
                      months2={altShort ? term - 12 : term + 12}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <AskAiButton
                    variant="solid"
                    question={`Я рассматриваю ${cfg.label.toLowerCase()} ${formatCurrency(principal)} на ${monthsToText(term)} с платежом ${formatCurrency(Math.round(best.result.monthlyPayment))}/мес под ${best.result.annualRate}%. Переплата ${formatCurrency(Math.round(best.result.overpayment))}. Стоит ли брать этот кредит и как снизить переплату?`}
                    label="Спросить AI: стоит ли брать?"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Список банков */}
          <motion.div variants={item} className="px-5 mb-2 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-text-primary flex items-center gap-2">
              <Landmark size={17} /> Сравнение банков
            </h2>
            <Badge variant="muted">{offers.filter(o => o.qualifies).length} из {offers.length}</Badge>
          </motion.div>
          <motion.div variants={item} className="px-5 flex flex-col gap-3">
            {offers.map((offer, i) => (
              <BankOfferCard key={offer.bank.id} offer={offer} rank={i} onOpen={() => setDetail(offer.bank)} />
            ))}
          </motion.div>
        </>
      )}

      {/* ── РЕФИНАНСИРОВАНИЕ ── */}
      {product === 'refinance' && (
        <>
          <motion.div variants={item} className="px-5 mb-4">
            <Card variant="default" padding="lg">
              <h2 className="text-base font-extrabold text-text-primary mb-1 flex items-center gap-2">
                Текущий кредит
                <InfoTip text="Введите параметры вашего действующего кредита. Мы посчитаем, выгодно ли его рефинансировать по рыночной ставке." />
              </h2>
              <p className="text-xs text-text-tertiary mb-4">Рефинансирование выгодно при разнице ставок от 1.5 п.п.</p>
              <div className="flex flex-col gap-5">
                <Slider label="Остаток долга" value={rfBalance} min={50_000} max={5_000_000} step={50_000}
                  display={formatCurrency(rfBalance, true)}
                  hint={`Ваша оставшаяся задолженность перед банком`} onChange={setRfBalance} />
                <Slider label="Текущая ставка" value={rfRate} min={5} max={45} step={0.5}
                  display={`${rfRate}%`}
                  hint={rfRate >= 25 ? 'Высокая ставка — рефинансирование, вероятно, выгодно' : rfRate >= 18 ? 'Средняя ставка — проверьте разницу' : 'Низкая ставка — рефинансирование вряд ли выгодно'}
                  hintType={rfRate >= 22 ? 'good' : rfRate >= 18 ? 'info' : 'warn'}
                  onChange={setRfRate} />
                <Slider label="Осталось платить" value={rfMonths} min={3} max={84} step={1}
                  display={monthsToText(rfMonths)}
                  hint={`Чем больше осталось — тем больше сэкономите при рефинансировании`} onChange={setRfMonths} />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={item} className="px-5 mb-4">
            <div className={`rounded-2xl p-5 border ${refi.worthIt ? 'bg-success-light border-success/20' : 'bg-bg-muted border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={18} className={refi.worthIt ? 'text-success' : 'text-text-tertiary'} />
                <span className="text-sm font-extrabold text-text-primary">
                  {refi.worthIt ? '✓ Рефинансирование выгодно' : 'Выгода незначительна'}
                </span>
              </div>
              {refi.worthIt ? (
                <>
                  <p className="text-xs text-text-tertiary mb-1">Сэкономите за оставшийся срок</p>
                  <p className="text-3xl font-extrabold text-success mb-4">{formatCurrency(Math.round(refi.totalSaving))}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/70 rounded-xl p-3">
                      <p className="text-xs text-text-tertiary">Платёж сейчас</p>
                      <p className="font-extrabold text-danger">{formatCurrency(Math.round(refi.oldPayment))}</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3">
                      <p className="text-xs text-text-tertiary">Новый платёж · {rfBestRate}%</p>
                      <p className="font-extrabold text-success">{formatCurrency(Math.round(refi.newPayment))}</p>
                    </div>
                  </div>
                  <FlagBadge flag={{ type: 'ok', text: `Минус ${formatCurrency(Math.round(refi.monthlySaving))} в месяц · ставка ${rfBestRate}%` }} />
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-text-secondary">
                    Разница ставок {rfRate}% → {rfBestRate}% = {(rfRate - rfBestRate).toFixed(1)} п.п. — меньше порога 1.5 п.п.
                  </p>
                  <FlagBadge flag={{ type: 'info', text: 'Рефинансирование обычно выгодно при разнице от 1.5 п.п. и сроке от 12 месяцев.' }} />
                </div>
              )}
              <div className="mt-4">
                <AskAiButton variant="solid"
                  question={`У меня кредит: остаток ${formatCurrency(rfBalance)}, ставка ${rfRate}%, осталось ${monthsToText(rfMonths)}. Стоит ли рефинансировать под ${rfBestRate}%? Какие подводные камни?`}
                  label="AI: стоит ли рефинансировать?" />
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ── ДОСРОЧНОЕ ПОГАШЕНИЕ ── */}
      {product === 'early' && (
        <>
          <motion.div variants={item} className="px-5 mb-4">
            <Card variant="default" padding="lg">
              <h2 className="text-base font-extrabold text-text-primary mb-1 flex items-center gap-2">
                Ваш кредит
                <InfoTip text="Укажите параметры действующего кредита. Калькулятор покажет, сколько вы сэкономите если доплачивать к ежемесячному платежу." />
              </h2>
              <p className="text-xs text-text-tertiary mb-4">Каждая доплата сначала погашает тело долга — проценты на него больше не начисляются.</p>
              <div className="flex flex-col gap-5">
                <Slider label="Остаток долга" value={epBalance} min={50_000} max={5_000_000} step={50_000}
                  display={formatCurrency(epBalance, true)} onChange={setEpBalance} />
                <Slider label="Ставка" value={epRate} min={5} max={45} step={0.5}
                  display={`${epRate}%`}
                  hint={epRate >= 20 ? 'Высокая ставка — каждая доплата экономит больше' : 'При низкой ставке деньги иногда выгоднее вложить'}
                  hintType={epRate >= 20 ? 'good' : 'info'}
                  onChange={setEpRate} />
                <Slider label="Осталось платить" value={epMonths} min={3} max={120} step={1}
                  display={monthsToText(epMonths)} onChange={setEpMonths} />
                <Slider
                  label="Доплата к платежу"
                  value={epExtra}
                  min={0} max={Math.max(50_000, Math.round(freeCash))} step={1_000}
                  display={`+${formatCurrency(epExtra, true)}`}
                  hint={epExtra === 0 ? 'Введите доплату чтобы увидеть эффект' :
                    epExtra > freeCash * 0.8 ? 'Большая доплата — убедитесь, что остаётся запас' :
                    `${Math.round((epExtra / (epBalance / epMonths)) * 100)}% от планового взноса — хороший темп`}
                  hintType={epExtra === 0 ? 'info' : epExtra > freeCash * 0.8 ? 'warn' : 'good'}
                  onChange={setEpExtra}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={item} className="px-5 mb-4">
            <div className="rounded-2xl p-5 bg-gradient-card-pink border border-primary/15">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-primary" />
                <span className="text-sm font-extrabold text-text-primary">Эффект досрочного погашения</span>
              </div>

              {epExtra > 0 ? (
                <>
                  {/* Главные цифры */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/70 rounded-xl p-3">
                      <p className="text-xs text-text-tertiary">Экономия на %</p>
                      <p className="text-xl font-extrabold text-success">{formatCurrency(Math.round(early.interestSaved), true)}</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3">
                      <p className="text-xs text-text-tertiary">Закроете раньше на</p>
                      <p className="text-xl font-extrabold text-primary">{monthsToText(early.monthsSaved)}</p>
                    </div>
                  </div>

                  {/* Сравнение сроков */}
                  <div className="bg-white/70 rounded-xl p-3 mb-3">
                    <p className="text-xs font-bold text-text-secondary mb-2">Срок закрытия</p>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="text-text-tertiary w-24 flex-shrink-0">Без доплат:</span>
                      <div className="flex-1 h-2 bg-danger/30 rounded-full" />
                      <span className="font-bold text-text-primary w-20 text-right">{monthsToText(early.baseMonths)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-tertiary w-24 flex-shrink-0">С доплатой:</span>
                      <div className="flex-1 h-2 bg-success rounded-full"
                           style={{ maxWidth: `${Math.round((early.newMonths / early.baseMonths) * 100)}%` }} />
                      <span className="font-bold text-success w-20 text-right">{monthsToText(early.newMonths)}</span>
                    </div>
                  </div>

                  {/* Переплата сравнение */}
                  <div className="flex items-center gap-3 bg-white/70 rounded-xl p-3 mb-4">
                    <div className="flex-1 text-center">
                      <p className="text-[11px] text-text-tertiary">Переплата без доплат</p>
                      <p className="font-extrabold text-danger">{formatCurrency(Math.round(early.baseInterest), true)}</p>
                    </div>
                    <ArrowRight size={16} className="text-text-tertiary flex-shrink-0" />
                    <div className="flex-1 text-center">
                      <p className="text-[11px] text-text-tertiary">Переплата с доплатой</p>
                      <p className="font-extrabold text-success">{formatCurrency(Math.round(early.newInterest), true)}</p>
                    </div>
                  </div>

                  <FlagBadge flag={{ type: 'ok', text: `Каждые +${formatCurrency(epExtra, true)}/мес экономят ${formatCurrency(Math.round(early.interestSaved / (early.monthsSaved || 1)), true)} на процентах` }} />
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-text-secondary">Введите сумму доплаты, чтобы увидеть сколько сэкономите.</p>
                  <FlagBadge flag={{ type: 'info', text: 'Даже +5 000₽/мес к платежу при ставке 20% закроет кредит на несколько месяцев раньше.' }} />
                </div>
              )}

              <div className="mt-4">
                <AskAiButton variant="solid"
                  question={`Кредит: остаток ${formatCurrency(epBalance)}, ставка ${epRate}%, срок ${monthsToText(epMonths)}. Если доплачивать ${formatCurrency(epExtra)}/мес — выгодно или лучше эти деньги инвестировать?`}
                  label="AI: гасить досрочно или копить?" />
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ── Детали банка ── */}
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && detailOffer && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold" style={{ backgroundColor: detail.color }}>{detail.short}</span>
              <div>
                <p className="font-extrabold text-text-primary">{detail.name}</p>
                <p className="text-xs text-text-tertiary">★ {detail.rating} · одобрение {detail.approvalTime}</p>
              </div>
            </div>

            {detailOffer.qualifies ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Платёж/мес', formatCurrency(Math.round(detailOffer.result.monthlyPayment))],
                    ['Ставка', `${detailOffer.result.annualRate}%`],
                    ['Переплата', formatCurrency(Math.round(detailOffer.result.overpayment))],
                    ['Всего вернёте', formatCurrency(Math.round(detailOffer.result.totalPaid))],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-bg-muted rounded-xl p-3">
                      <p className="text-xs text-text-tertiary">{label}</p>
                      <p className="font-extrabold text-text-primary">{val}</p>
                    </div>
                  ))}
                </div>
                <PaymentDonut principal={detailOffer.result.principal} overpayment={detailOffer.result.overpayment} />
              </>
            ) : (
              <div className="bg-warning-light rounded-xl p-3 flex items-center gap-2 text-sm text-warning font-semibold">
                <TriangleAlert size={16} />
                Запрошенная сумма/срок вне условий: до {formatCurrency(detail.maxAmount, true)}, {detail.minTermMonths}–{detail.maxTermMonths} мес.
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">Условия</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: <FileText size={14} />, text: detail.requiresIncomeProof ? 'Нужна справка о доходах' : 'Без справок о доходах' },
                  { icon: <ShieldCheck size={14} />, text: detail.insuranceAvailable ? 'Страховка снижает ставку' : 'Без страхования' },
                  { icon: <Clock size={14} />, text: detail.earlyRepaymentFree ? 'Досрочное погашение без комиссии' : 'Досрочное погашение с комиссией' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-text-tertiary">{icon}</span> {text}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">Преимущества</p>
              <ul className="flex flex-col gap-1.5">
                {detail.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <BadgeCheck size={14} className="text-success mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-text-tertiary text-center">Расчёт предварительный. Итоговые условия определяет банк.</p>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};
