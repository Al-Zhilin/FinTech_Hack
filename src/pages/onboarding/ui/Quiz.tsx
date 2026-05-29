import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { QuizAnswers } from '@/shared/types';
import { QUIZ_QUESTIONS, EMPTY_ANSWERS } from '../model/quiz';

interface QuizProps {
  userName: string;
  onComplete: (answers: QuizAnswers) => void;
  onBack: () => void;
}

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

export const Quiz = ({ userName, onComplete, onBack }: QuizProps) => {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [incomeText, setIncomeText] = useState('');

  const q = QUIZ_QUESTIONS[step];
  const total = QUIZ_QUESTIONS.length;
  const isLast = step === total - 1;

  const goNext = () => {
    if (isLast) return onComplete(answers);
    setDir(1);
    setStep(s => s + 1);
  };
  const goBack = () => {
    if (step === 0) return onBack();
    setDir(-1);
    setStep(s => s - 1);
  };

  const selectSingle = (id: string) => setAnswers(a => ({ ...a, [q.key]: id }));
  const toggleMulti = (id: string) =>
    setAnswers(a => {
      const cur = a.obligatoryCategories;
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      return { ...a, obligatoryCategories: next };
    });

  const answered = (() => {
    if (q.type === 'number') return answers.income > 0;
    if (q.type === 'multi') return answers.obligatoryCategories.length > 0;
    return (answers[q.key] as string) !== '';
  })();

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Progress */}
      <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-border-light">
        <motion.div
          className="h-full bg-gradient-primary rounded-full"
          initial={false}
          animate={{ width: `${((step + 1) / total) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <button
        onClick={goBack}
        className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full bg-border-light flex items-center justify-center text-text-secondary"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="absolute top-5 right-5 z-10 text-sm text-text-tertiary font-medium">
        {step + 1}/{total}
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-1 flex flex-col px-6 pt-16 pb-8 overflow-y-auto"
        >
          <div className="mb-6">
            <div className="text-4xl mb-3">{q.emoji}</div>
            <h2 className="text-2xl font-bold text-text-primary leading-tight mb-2">
              {step === 0 && userName ? `${userName}, ${q.title.charAt(0).toLowerCase()}${q.title.slice(1)}` : q.title}
            </h2>
            {q.subtitle && <p className="text-text-secondary text-sm">{q.subtitle}</p>}
          </div>

          {/* Number */}
          {q.type === 'number' && (
            <Input
              label="Доход в месяц"
              placeholder={q.placeholder}
              type="number"
              inputMode="numeric"
              suffix={<span className="text-sm font-medium text-text-secondary">{q.suffix}</span>}
              value={incomeText}
              onChange={e => {
                setIncomeText(e.target.value);
                setAnswers(a => ({ ...a, income: Number(e.target.value.replace(/\D/g, '')) }));
              }}
              autoFocus
            />
          )}

          {/* Single */}
          {q.type === 'single' && (
            <div className="flex flex-col gap-2.5">
              {q.options!.map(opt => {
                const active = (answers[q.key] as string) === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectSingle(opt.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${active
                      ? 'border-primary bg-primary-light shadow-md shadow-primary/10'
                      : 'border-border bg-bg-muted hover:border-primary/30'}`}
                  >
                    {opt.icon && <span className="text-xl">{opt.icon}</span>}
                    <span className="font-medium text-text-primary text-[15px] flex-1">{opt.label}</span>
                    {active && <CheckDot />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi */}
          {q.type === 'multi' && (
            <div className="grid grid-cols-2 gap-2.5">
              {q.options!.map(opt => {
                const active = answers.obligatoryCategories.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleMulti(opt.id)}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${active
                      ? 'border-primary bg-primary-light shadow-sm'
                      : 'border-border bg-bg-muted hover:border-primary/30'}`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-medium text-text-primary text-sm flex-1 leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-auto pt-6">
            <Button size="lg" fullWidth onClick={goNext} disabled={!answered}>
              {isLast ? 'Готово' : 'Продолжить'}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const CheckDot = () => (
  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);
