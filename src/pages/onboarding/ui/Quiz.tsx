import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { QuizAnswers } from '@/shared/types';
import { QUIZ_QUESTIONS, EMPTY_ANSWERS } from '../model/quiz';

/**
 * 5 слайдов вместо 9 — вопросы сгруппированы по теме,
 * но все 9 полей QuizAnswers собираются так же.
 *
 * Слайд 1: Кто вы + доход
 * Слайд 2: Обязательные платежи  (multi)
 * Слайд 3: Кредиты + деньги до зп
 * Слайд 4: Подушка + отношение к кредиткам
 * Слайд 5: Приоритет + цель
 */

interface QuizProps {
  userName: string;
  onComplete: (answers: QuizAnswers) => void;
  onBack: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const qBy = (key: keyof QuizAnswers) => QUIZ_QUESTIONS.find(q => q.key === key)!;

const SLIDES = [
  { keys: ['persona', 'income'] as (keyof QuizAnswers)[] },
  { keys: ['obligatoryCategories'] as (keyof QuizAnswers)[] },
  { keys: ['credits', 'moneyLeft'] as (keyof QuizAnswers)[] },
  { keys: ['cushion', 'cardAttitude'] as (keyof QuizAnswers)[] },
  { keys: ['priority', 'currentGoal'] as (keyof QuizAnswers)[] },
];

const SLIDE_TITLES = [
  'О вас',
  'Обязательные расходы',
  'Кредиты и расходы',
  'Накопления',
  'Ваши цели',
];

const SLIDE_EMOJIS = ['🙋', '🧾', '🏦', '🛟', '🎯'];

const slide = {
  enter: (d: number) => ({ x: d > 0 ? '70%' : '-70%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? '-70%' : '70%', opacity: 0 }),
};

// ── sub-components ────────────────────────────────────────────────────────────

const CheckDot = () => (
  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
);

function SinglePicker({
  questionKey, answers, onChange,
}: { questionKey: keyof QuizAnswers; answers: QuizAnswers; onChange: (v: string) => void }) {
  const q = qBy(questionKey);
  const value = answers[questionKey] as string;
  return (
    <div className="flex flex-col gap-2">
      {q.options!.map(opt => {
        const active = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${
              active ? 'border-primary bg-primary-light shadow-sm' : 'border-border bg-bg-muted'
            }`}>
            {opt.icon && <span className="text-lg">{opt.icon}</span>}
            <span className="font-medium text-text-primary text-sm flex-1">{opt.label}</span>
            {active && <CheckDot />}
          </button>
        );
      })}
    </div>
  );
}

function MultiPicker({
  answers, onChange,
}: { answers: QuizAnswers; onChange: (v: string) => void }) {
  const q = qBy('obligatoryCategories');
  const selected = answers.obligatoryCategories;
  return (
    <div className="grid grid-cols-2 gap-2">
      {q.options!.map(opt => {
        const active = selected.includes(opt.id);
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
              active ? 'border-primary bg-primary-light' : 'border-border bg-bg-muted'
            }`}>
            <span className="text-lg">{opt.icon}</span>
            <span className="font-medium text-text-primary text-sm leading-tight">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Quiz ─────────────────────────────────────────────────────────────────

export const Quiz = ({ userName, onComplete, onBack }: QuizProps) => {
  const [step, setStep]       = useState(0);
  const [dir, setDir]         = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [incomeText, setIncomeText] = useState('');

  const total  = SLIDES.length;
  const isLast = step === total - 1;

  const setField = (key: keyof QuizAnswers, val: string | string[] | number) =>
    setAnswers(a => ({ ...a, [key]: val }));

  const toggleMulti = (id: string) =>
    setAnswers(a => {
      const cur  = a.obligatoryCategories;
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      return { ...a, obligatoryCategories: next };
    });

  // Is current slide complete?
  const isReady = (() => {
    const keys = SLIDES[step].keys;
    return keys.every(k => {
      if (k === 'income')                 return answers.income > 0;
      if (k === 'obligatoryCategories')   return answers.obligatoryCategories.length > 0;
      return (answers[k] as string) !== '';
    });
  })();

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

  const currentSlide = SLIDES[step];

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Progress */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-border-light z-10">
        <motion.div className="h-full bg-gradient-primary rounded-full"
          animate={{ width: `${((step + 1) / total) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}/>
      </div>

      {/* Back + counter */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <button onClick={goBack}
          className="w-9 h-9 rounded-full bg-border-light flex items-center justify-center text-text-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="text-sm font-semibold text-text-tertiary">{step + 1} / {total}</span>
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} custom={dir} variants={slide}
          initial="enter" animate="center" exit="exit"
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-5">

          {/* Slide header */}
          <div className="pt-2 pb-1">
            <span className="text-3xl">{SLIDE_EMOJIS[step]}</span>
            <h2 className="text-xl font-bold text-text-primary mt-2">{SLIDE_TITLES[step]}</h2>
            {step === 0 && userName && (
              <p className="text-sm text-text-secondary mt-0.5">{userName}, пара вопросов о вас</p>
            )}
          </div>

          {/* Question blocks */}
          {currentSlide.keys.map((key, qi) => {
            const q = qBy(key);
            return (
              <div key={key} className="flex flex-col gap-2.5">
                {/* Label (hide for first question if it's the only one) */}
                {(currentSlide.keys.length > 1) && (
                  <p className="text-sm font-semibold text-text-secondary">{q.title}</p>
                )}
                {currentSlide.keys.length === 1 && (
                  <p className="text-base font-bold text-text-primary">{q.title}</p>
                )}

                {/* Render appropriate picker */}
                {key === 'income' ? (
                  <Input label="" placeholder={q.placeholder ?? '50 000'} type="number"
                    inputMode="numeric"
                    suffix={<span className="text-sm font-medium text-text-secondary">₽</span>}
                    value={incomeText}
                    onChange={e => {
                      setIncomeText(e.target.value);
                      setField('income', Number(e.target.value.replace(/\D/g, '')));
                    }}
                  />
                ) : key === 'obligatoryCategories' ? (
                  <MultiPicker answers={answers} onChange={toggleMulti}/>
                ) : (
                  <SinglePicker questionKey={key} answers={answers}
                    onChange={v => setField(key, v)}/>
                )}

                {qi < currentSlide.keys.length - 1 && (
                  <div className="h-px bg-border-light my-1"/>
                )}
              </div>
            );
          })}

          {/* Spacer so content doesn't hide behind button */}
          <div className="h-20"/>
        </motion.div>
      </AnimatePresence>

      {/* Sticky bottom button */}
      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent">
        <Button size="lg" fullWidth onClick={goNext} disabled={!isReady}>
          {isLast ? 'Готово 🚀' : 'Продолжить'}
        </Button>
      </div>
    </div>
  );
};
