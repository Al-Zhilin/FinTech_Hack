// ─── User Types ───────────────────────────────────────────────────────────────

export type FinancialGoal =
  | 'emergency_fund'
  | 'vacation'
  | 'apartment'
  | 'car'
  | 'business'
  | 'retirement'
  | 'other';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string; // base64 data URL
  income: number;
  goal: FinancialGoal;
  goalLabel: string;
  monthlyExpenses: number;
  hasCredits: boolean;
  creditAmount?: number;
  createdAt: string;
  // Onboarding quiz + derived analysis
  quiz?: QuizAnswers;
  analysis?: QuizAnalysis;
  // Settings (optional for backwards-compat with older stored users)
  notificationsEnabled?: boolean;
  darkMode?: boolean;
  language?: 'ru' | 'en';
}

// ─── Onboarding Quiz Types ───────────────────────────────────────────────────

export interface QuizAnswers {
  persona: string;                 // q1 — кто вы сейчас
  income: number;                  // q2 — ежемесячный доход
  obligatoryCategories: string[];  // q3 — обязательные платежи
  credits: string;                 // q4 — кредиты / займы
  moneyLeft: string;               // q5 — остаются ли деньги до зарплаты
  cushion: string;                 // q6 — подушка безопасности
  cardAttitude: string;            // q7 — отношение к кредиткам
  priority: string;                // q8 — что важнее финансово
  currentGoal: string;             // q9 — финансовая цель прямо сейчас
}

export interface QuizAnalysis {
  healthScore: number;     // 0–100, выше = здоровее финансы
  riskLevel: 'low' | 'medium' | 'high';
  personaLabel: string;
  summary: string;
  tags: string[];
  recommendations: string[];
}

// ─── Finance Types ─────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'housing'
  | 'education'
  | 'subscriptions'
  | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  merchant?: string;
}

export interface CategorySummary {
  category: ExpenseCategory;
  label: string;
  amount: number;
  budget: number;
  color: string;
  icon: string;
}

export interface Subscription {
  id: string;
  title: string;
  amount: number;
  nextDate: string;
  category: ExpenseCategory;
  icon: string;
  color: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
  color: string;
  icon: string;
}

export interface AiInsight {
  id: string;
  type: 'warning' | 'success' | 'tip' | 'forecast';
  title: string;
  body: string;
  action?: string;
}

export interface FinancialProfile {
  balance: number;
  monthlyIncome: number;
  monthlySpent: number;
  monthlyBudget: number;
  savingsRate: number;
  stressScore: number; // 0–100, higher = more stress
  categories: CategorySummary[];
  subscriptions: Subscription[];
  goals: Goal[];
  recentExpenses: Expense[];
  insights: AiInsight[];
  upcomingPayments: Subscription[];
}

// ─── Bank / Credit Types ─────────────────────────────────────────────────────

export interface Bank {
  id: string;
  name: string;
  short: string;       // initials/short label for logo chip
  color: string;       // brand color
  rateFrom: number;    // annual %, with insurance / salary client
  rateBase: number;    // annual %, standard
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  requiresIncomeProof: boolean;
  insuranceAvailable: boolean;
  earlyRepaymentFree: boolean;
  approvalTime: string;       // "5 минут", "1 день"
  rating: number;             // 0–5
  features: string[];         // conditions / nuances
  isUserBank?: boolean;       // user already has account here
}

export type PaymentType = 'annuity' | 'differentiated';

export interface LoanResult {
  monthlyPayment: number;   // annuity: constant; differentiated: first month
  lastPayment: number;      // differentiated: last (smallest) month
  totalPaid: number;
  overpayment: number;
  principal: number;
  months: number;
  annualRate: number;
}

export type AffordabilityLevel = 'comfortable' | 'moderate' | 'risky';

export interface BankOffer {
  bank: Bank;
  result: LoanResult;
  affordability: AffordabilityLevel;
  qualifies: boolean;        // amount & term within bank limits
  paymentToIncome: number;   // ratio 0–1
}

// ─── Chat Types ────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isTyping?: boolean;
}
