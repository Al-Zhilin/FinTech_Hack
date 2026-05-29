import type { AffordabilityLevel, LoanResult, PaymentType } from '@/shared/types';

// ─── Annuity (equal payments) ─────────────────────────────────────────────────
// P = S · r·(1+r)^n / ((1+r)^n − 1)
export function calcAnnuity(principal: number, annualRate: number, months: number): LoanResult {
  const r = annualRate / 100 / 12;
  let monthlyPayment: number;

  if (r === 0) {
    monthlyPayment = principal / months;
  } else {
    const pow = Math.pow(1 + r, months);
    monthlyPayment = (principal * r * pow) / (pow - 1);
  }

  const totalPaid = monthlyPayment * months;
  return {
    monthlyPayment,
    lastPayment: monthlyPayment,
    totalPaid,
    overpayment: totalPaid - principal,
    principal,
    months,
    annualRate,
  };
}

// ─── Differentiated (declining payments) ──────────────────────────────────────
// Body part is constant; interest is charged on the remaining balance.
export function calcDifferentiated(principal: number, annualRate: number, months: number): LoanResult {
  const r = annualRate / 100 / 12;
  const bodyPart = principal / months;
  let totalPaid = 0;
  let firstPayment = 0;
  let lastPayment = 0;

  for (let i = 0; i < months; i++) {
    const remaining = principal - bodyPart * i;
    const interest = remaining * r;
    const payment = bodyPart + interest;
    totalPaid += payment;
    if (i === 0) firstPayment = payment;
    if (i === months - 1) lastPayment = payment;
  }

  return {
    monthlyPayment: firstPayment,
    lastPayment,
    totalPaid,
    overpayment: totalPaid - principal,
    principal,
    months,
    annualRate,
  };
}

export function calcLoan(
  principal: number,
  annualRate: number,
  months: number,
  type: PaymentType,
): LoanResult {
  return type === 'annuity'
    ? calcAnnuity(principal, annualRate, months)
    : calcDifferentiated(principal, annualRate, months);
}

// ─── Affordability ─────────────────────────────────────────────────────────────
// Based on debt-to-income ratio + remaining free cash flow.
export interface Affordability {
  freeCash: number;          // income − expenses − existing credit obligations
  paymentToIncome: number;   // ratio 0–1
  level: AffordabilityLevel;
  comfortablePayment: number; // 30% of income heuristic
  maxPayment: number;         // 50% of income hard ceiling
}

export function assessAffordability(
  payment: number,
  income: number,
  expenses: number,
  existingCredit = 0,
): Affordability {
  const freeCash = income - expenses - existingCredit;
  const paymentToIncome = income > 0 ? payment / income : Infinity;
  const comfortablePayment = income * 0.3;
  const maxPayment = income * 0.5;

  let level: AffordabilityLevel;
  if (paymentToIncome <= 0.3 && payment <= freeCash) level = 'comfortable';
  else if (paymentToIncome <= 0.5 && payment <= freeCash * 1.05) level = 'moderate';
  else level = 'risky';

  return { freeCash, paymentToIncome, level, comfortablePayment, maxPayment };
}

// ─── Max affordable loan ────────────────────────────────────────────────────────
// Сколько максимум можно занять, чтобы платёж остался комфортным
// (≤30% дохода и в пределах свободных денег).
export interface MaxLoan {
  comfortablePayment: number; // безопасный платёж в месяц
  principal: number;          // максимальная сумма кредита под этот платёж
}

export function maxAffordablePrincipal(
  income: number,
  expenses: number,
  existingCredit: number,
  annualRate: number,
  months: number,
): MaxLoan {
  const freeCash = income - expenses - existingCredit;
  const comfortablePayment = Math.max(0, Math.min(income * 0.3, freeCash));
  const r = annualRate / 100 / 12;

  if (comfortablePayment <= 0) return { comfortablePayment: 0, principal: 0 };

  let principal: number;
  if (r === 0) {
    principal = comfortablePayment * months;
  } else {
    const pow = Math.pow(1 + r, months);
    principal = (comfortablePayment * (pow - 1)) / (r * pow);
  }
  return { comfortablePayment, principal: Math.round(principal) };
}

// ─── Refinancing ─────────────────────────────────────────────────────────────────
export interface RefinanceResult {
  oldPayment: number;
  newPayment: number;
  monthlySaving: number;
  totalSaving: number;   // экономия за оставшийся срок
  worthIt: boolean;
}

export function calcRefinance(
  balance: number,
  oldRate: number,
  newRate: number,
  monthsLeft: number,
): RefinanceResult {
  const oldPayment = calcAnnuity(balance, oldRate, monthsLeft).monthlyPayment;
  const newPayment = calcAnnuity(balance, newRate, monthsLeft).monthlyPayment;
  const monthlySaving = oldPayment - newPayment;
  const totalSaving = monthlySaving * monthsLeft;
  return {
    oldPayment,
    newPayment,
    monthlySaving,
    totalSaving,
    worthIt: monthlySaving > 0 && oldRate - newRate >= 1.5,
  };
}

// ─── Early repayment ──────────────────────────────────────────────────────────────
export interface EarlyRepaymentResult {
  baseMonths: number;
  baseInterest: number;
  newMonths: number;
  newInterest: number;
  monthsSaved: number;
  interestSaved: number;
}

export function calcEarlyRepayment(
  balance: number,
  annualRate: number,
  months: number,
  extraMonthly: number,
): EarlyRepaymentResult {
  const r = annualRate / 100 / 12;
  const base = calcAnnuity(balance, annualRate, months);
  const payment = base.monthlyPayment + extraMonthly;

  let bal = balance;
  let m = 0;
  let interestPaid = 0;
  while (bal > 0 && m < 1200) {
    const interest = bal * r;
    let principalPart = payment - interest;
    if (principalPart <= 0) break; // платёж не покрывает проценты
    if (principalPart >= bal) {
      interestPaid += interest;
      bal = 0;
      m++;
      break;
    }
    bal -= principalPart;
    interestPaid += interest;
    m++;
  }

  return {
    baseMonths: months,
    baseInterest: base.overpayment,
    newMonths: m,
    newInterest: interestPaid,
    monthsSaved: months - m,
    interestSaved: base.overpayment - interestPaid,
  };
}
