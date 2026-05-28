import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { FinancialGoal, User } from '@/shared/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  income: string;
  goal: FinancialGoal | '';
  monthlyExpenses: string;
  hasCredits: boolean;
  creditAmount: string;
}

const GOALS: { value: FinancialGoal; label: string; icon: string; desc: string }[] = [
  { value: 'emergency_fund', label: 'Подушка безопасности', icon: '🛡️', desc: '3–6 месячных расходов' },
  { value: 'vacation',       label: 'Отпуск мечты',         icon: '✈️', desc: 'Путешествие без долгов' },
  { value: 'apartment',      label: 'Квартира',              icon: '🏠', desc: 'Накопить на первый взнос' },
  { value: 'car',            label: 'Автомобиль',            icon: '🚗', desc: 'Своё авто без кредита' },
  { value: 'business',       label: 'Бизнес',                icon: '🚀', desc: 'Запустить своё дело' },
  { value: 'retirement',     label: 'Пенсия',                icon: '🌴', desc: 'Финансовая независимость' },
];

// ─── Slide variants ────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

const slideTransition = { type: 'spring', stiffness: 300, damping: 30 };

// ─── Component ─────────────────────────────────────────────────────────────────

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const completeOnboarding = useUserStore(s => s.completeOnboarding);

  const [step, setStep] = useState(0); // 0 = splash, 1-4 = form steps
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: '', income: '', goal: '', monthlyExpenses: '',
    hasCredits: false, creditAmount: '',
  });

  const totalSteps = 5; // 1 splash + 4 form

  const go = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const handleFinish = () => {
    const user: User = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      income: Number(form.income.replace(/\D/g, '')),
      goal: form.goal as FinancialGoal,
      goalLabel: GOALS.find(g => g.value === form.goal)?.label ?? '',
      monthlyExpenses: Number(form.monthlyExpenses.replace(/\D/g, '')),
      hasCredits: form.hasCredits,
      creditAmount: form.hasCredits ? Number(form.creditAmount.replace(/\D/g, '')) : undefined,
      createdAt: new Date().toISOString(),
    };
    completeOnboarding(user);
    navigate('/dashboard', { replace: true });
  };

  const canNext = () => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return Number(form.income) > 0 || form.income.replace(/\D/g, '').length > 0;
    if (step === 3) return form.goal !== '';
    if (step === 4) return form.monthlyExpenses.replace(/\D/g, '').length > 0;
    return true;
  };

  const progressPct = step === 0 ? 0 : ((step) / 4) * 100;

  return (
    <div className="w-full max-w-mobile h-dvh bg-white flex flex-col overflow-hidden relative">

      {/* Progress bar */}
      {step > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-border-light">
          <motion.div
            className="h-full bg-gradient-primary rounded-full"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Back button */}
      {step > 0 && (
        <button
          onClick={() => go(step - 1)}
          className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full bg-border-light flex items-center justify-center text-text-secondary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Skip / step counter */}
      {step > 0 && (
        <div className="absolute top-5 right-5 z-10 text-sm text-text-tertiary font-medium">
          {step}/4
        </div>
      )}

      {/* Slides */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
          className="flex-1 flex flex-col"
        >
          {step === 0 && <SplashStep onStart={() => go(1)} />}
          {step === 1 && <NameStep form={form} setForm={setForm} onNext={() => go(2)} canNext={canNext()} />}
          {step === 2 && <IncomeStep form={form} setForm={setForm} onNext={() => go(3)} canNext={canNext()} />}
          {step === 3 && <GoalStep form={form} setForm={setForm} onNext={() => go(4)} canNext={canNext()} />}
          {step === 4 && <ExpensesStep form={form} setForm={setForm} onFinish={handleFinish} canNext={canNext()} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── Step 0: Splash ────────────────────────────────────────────────────────────

const SplashStep = ({ onStart }: { onStart: () => void }) => (
  <div className="flex-1 flex flex-col">
    {/* Hero illustration area */}
    <div className="flex-1 flex items-center justify-center bg-gradient-hero relative overflow-hidden pt-16 pb-8">
      {/* Pink circle background */}
      <div className="absolute w-72 h-72 rounded-full bg-primary/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative z-10 text-center px-8">
        {/* Illustration using emojis + decorative elements */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="relative inline-flex flex-col items-center"
        >
          <div className="text-8xl mb-2">💳</div>
          <div className="absolute -top-4 -right-8 text-4xl animate-bounce">💰</div>
          <div className="absolute top-8 -left-10 text-3xl" style={{ animationDelay: '0.2s' }}>🛒</div>
          <div className="absolute -bottom-2 -right-12 text-3xl">🧾</div>
        </motion.div>
      </div>
    </div>

    {/* Content */}
    <motion.div
      className="px-6 pt-8 pb-10 flex flex-col gap-6 bg-white"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {/* Dots indicator */}
      <div className="flex gap-1.5 justify-center">
        <span className="w-6 h-1.5 rounded-full bg-primary" />
        <span className="w-1.5 h-1.5 rounded-full bg-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-border" />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-text-primary leading-tight mb-3">
          Спокойствие<br />каждый день
        </h1>
        <p className="text-text-secondary text-base leading-relaxed">
          Деньги больше не хаос. Мы подскажем, где вы теряете контроль
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button size="lg" fullWidth onClick={onStart} className="gap-2">
          Начать →
        </Button>
        <button className="text-primary font-semibold text-base py-2">
          У меня есть аккаунт
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── Step 1: Name ──────────────────────────────────────────────────────────────

const NameStep = ({ form, setForm, onNext, canNext }: StepProps) => (
  <div className="flex-1 flex flex-col px-6 pt-16 pb-10">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-8">
      <div>
        <div className="text-4xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Как вас зовут?</h2>
        <p className="text-text-secondary">Введите имя, чтобы мы могли персонализировать советы</p>
      </div>

      <Input
        label="Ваше имя"
        placeholder="Например, Иван"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        autoFocus
      />

      <div className="mt-auto pt-4">
        <Button size="lg" fullWidth onClick={onNext} disabled={!canNext}>
          Продолжить
        </Button>
      </div>
    </motion.div>
  </div>
);

// ─── Step 2: Income ────────────────────────────────────────────────────────────

const IncomeStep = ({ form, setForm, onNext, canNext }: StepProps) => (
  <div className="flex-1 flex flex-col px-6 pt-16 pb-10">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-8">
      <div>
        <div className="text-4xl mb-4">💵</div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {form.name ? `${form.name}, ` : ''}ваш доход?
        </h2>
        <p className="text-text-secondary">Укажите ежемесячный доход после налогов</p>
      </div>

      <Input
        label="Доход в месяц"
        placeholder="100 000"
        type="number"
        inputMode="numeric"
        suffix={<span className="text-sm font-medium text-text-secondary">₽</span>}
        value={form.income}
        onChange={e => setForm(f => ({ ...f, income: e.target.value }))}
        autoFocus
      />

      <div className="bg-success-light rounded-xl p-4 flex gap-3">
        <span className="text-xl">🔒</span>
        <p className="text-sm text-success font-medium">Данные хранятся только на вашем устройстве</p>
      </div>

      <div className="mt-auto pt-4">
        <Button size="lg" fullWidth onClick={onNext} disabled={!canNext}>
          Продолжить
        </Button>
      </div>
    </motion.div>
  </div>
);

// ─── Step 3: Goal ──────────────────────────────────────────────────────────────

const GoalStep = ({ form, setForm, onNext, canNext }: StepProps) => (
  <div className="flex-1 flex flex-col px-6 pt-16 pb-10">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Главная цель</h2>
        <p className="text-text-secondary">На что копим в первую очередь?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {GOALS.map(g => (
          <button
            key={g.value}
            onClick={() => setForm(f => ({ ...f, goal: g.value }))}
            className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
              form.goal === g.value
                ? 'border-primary bg-primary-light shadow-primary/20 shadow-md'
                : 'border-border bg-bg-muted hover:border-primary/30'
            }`}
          >
            <span className="text-2xl">{g.icon}</span>
            <span className="font-semibold text-sm text-text-primary leading-tight">{g.label}</span>
            <span className="text-xs text-text-tertiary">{g.desc}</span>
          </button>
        ))}
      </div>

      <Button size="lg" fullWidth onClick={onNext} disabled={!canNext}>
        Продолжить
      </Button>
    </motion.div>
  </div>
);

// ─── Step 4: Expenses ─────────────────────────────────────────────────────────

const ExpensesStep = ({ form, setForm, onFinish, canNext }: StepProps & { onFinish: () => void }) => (
  <div className="flex-1 flex flex-col px-6 pt-16 pb-10">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6">
      <div>
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Расходы</h2>
        <p className="text-text-secondary">Укажите примерные ежемесячные расходы</p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Ежемесячные расходы"
          placeholder="60 000"
          type="number"
          inputMode="numeric"
          suffix={<span className="text-sm font-medium text-text-secondary">₽</span>}
          value={form.monthlyExpenses}
          onChange={e => setForm(f => ({ ...f, monthlyExpenses: e.target.value }))}
          autoFocus
        />

        {/* Credits toggle */}
        <div className="flex items-center justify-between p-4 bg-bg-muted rounded-xl">
          <div>
            <p className="font-medium text-text-primary text-sm">Есть кредиты или ипотека?</p>
            <p className="text-xs text-text-tertiary mt-0.5">Для точного расчёта нагрузки</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, hasCredits: !f.hasCredits }))}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              form.hasCredits ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              form.hasCredits ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <AnimatePresence>
          {form.hasCredits && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Input
                label="Ежемесячный платёж по кредитам"
                placeholder="15 000"
                type="number"
                inputMode="numeric"
                suffix={<span className="text-sm font-medium text-text-secondary">₽</span>}
                value={form.creditAmount}
                onChange={e => setForm(f => ({ ...f, creditAmount: e.target.value }))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto pt-2">
        <Button size="lg" fullWidth onClick={onFinish} disabled={!canNext} className="mb-3">
          Начать анализ 🚀
        </Button>
        <p className="text-xs text-center text-text-tertiary">
          Нажимая «Начать», вы принимаете условия использования
        </p>
      </div>
    </motion.div>
  </div>
);

// ─── Shared step props ─────────────────────────────────────────────────────────

interface StepProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onNext?: () => void;
  canNext: boolean;
}
