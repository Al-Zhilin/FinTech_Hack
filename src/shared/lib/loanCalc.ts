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
