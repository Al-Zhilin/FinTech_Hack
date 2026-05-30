import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingStep, extractOptions, stripOptions } from '@/shared/api/onboarding';
import { Button } from '@/shared/ui/Button';

export interface ExtractedFinancials {
  income: number;
  hasCredits: boolean;
  creditAmount: number;
  hasCushion: boolean;
}

interface AIOnboardingProps {
  userLogin: string;
  onBack: () => void;
  onComplete: (profileSummary: string, financials: ExtractedFinancials) => void;
}

const TOTAL_QUESTIONS = 9;

function extractFinancials(history: QA[]): ExtractedFinancials {
  let income = 0;
  let hasCredits = false;
  let creditAmount = 0;
  let hasCushion = false;

  for (const { question, answer } of history) {
    const q = (question ?? '').toLowerCase();
    const a = answer ?? '';
    const aL = a.toLowerCase();

    // Income: вопрос о доходе + числовой ответ
    if (q.includes('доход') || q.includes('зарплат') || q.includes('зарабатыва') || q.includes('получа')) {
      const n = parseInt(a.replace(/[^0-9]/g, ''));
      if (n >= 5_000 && n <= 5_000_000) income = n;
    }

    // Кредиты: матчим по тексту кнопок и ключевым словам
    if (a.includes('Да, один') || a.includes('Да, два') || a.includes('есть просрочки')) {
      hasCredits = true;
    }
    if (/^нет$/i.test(a.trim()) && (q.includes('кредит') || q.includes('займ'))) {
      hasCredits = false;
    }
    if (q.includes('кредит') || q.includes('займ')) {
      if (!aL.startsWith('нет') && (aL.includes('да') || aL.includes('один') || aL.includes('два') || aL.includes('просрочк'))) {
        hasCredits = true;
      }
      // попытка вытащить сумму платежа
      const creditNum = parseInt(a.replace(/[^0-9]/g, ''));
      if (creditNum >= 500 && creditNum < income) creditAmount = creditNum;
    }

    // Подушка безопасности
    if (a.includes('3+ месячных') || a.includes('1–2 дохода') || a.includes('немного (1')) {
      hasCushion = true;
    }
    if (a.includes('Вообще нет') || a.includes('Долги, а не')) {
      hasCushion = false;
    }
    if (q.includes('подушк') || q.includes('накоплен') || q.includes('резерв')) {
      if (!aL.includes('нет') && !aL.includes('долг') && (aL.includes('да') || aL.includes('есть') || aL.includes('+') || aL.includes('месяц'))) {
        hasCushion = true;
      }
    }
  }

  return { income, hasCredits, creditAmount, hasCushion };
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'В очереди…',
  processing: 'Обрабатываем ответ…',
  searching: 'Ищем данные…',
  analyzing: 'Анализируем…',
};

// Первый вопрос — статический (бэкенд начинает диалог уже с ответа на него).
const FIRST_QUESTION = 'Кто вы сейчас?';
const FIRST_OPTIONS = [
  '🎓 Студент',
  '💼 Работаю по найму',
  '🚀 Предприниматель',
  '💻 Фрилансер',
  '🌴 На пенсии',
  '🔍 В поиске работы',
];

interface QA { question: string; answer: string }

export const AIOnboarding = ({ userLogin, onBack, onComplete }: AIOnboardingProps) => {
  const [question, setQuestion] = useState(FIRST_QUESTION);
  const [options, setOptions] = useState<string[]>(FIRST_OPTIONS);
  const [suggestedAnswers, setSuggestedAnswers] = useState<string[]>([]);
  const [history, setHistory] = useState<QA[]>([]);     // отвеченные пары
  const [questionNum, setQuestionNum] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');

  const answer = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || isLoading) return;

    const askedQuestion = question;
    setHistory(prev => [...prev, { question: askedQuestion, answer: text }]);
    setLastAnswer(text);
    setCustom('');
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const result = await onboardingStep(
        userLogin,
        text,
        s => setStatus(STATUS_LABELS[s] ?? s),
      );
      setStatus(null);

      if (result.complete) {
        setIsComplete(true);
        setSuggestedAnswers([]);
        const finalSummary = result.profile_summary ?? 'Ваш финансовый профиль готов!';
        setSummary(finalSummary);
      } else if (result.question) {
        setQuestion(stripOptions(result.question) || result.question);
        setOptions(extractOptions(result));
        setSuggestedAnswers(Array.isArray(result.suggested_answers) ? result.suggested_answers.filter(Boolean) : []);
        setQuestionNum(n => Math.min(n + 1, TOTAL_QUESTIONS));
      }
      if (result.error && !result.complete) console.warn('Backend:', result.error);
    } catch (err) {
      // откатываем последний вопрос из истории, чтобы можно было повторить
      setHistory(prev => prev.slice(0, -1));
      setError(err instanceof Error ? err.message : 'Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  }, [userLogin, question, isLoading]);

  // Небольшая задержка перед переходом на plan-экран — даём пользователю увидеть анимацию
  useEffect(() => {
    if (!isComplete) return;
    const id = setTimeout(() => {
      onComplete(summary, extractFinancials(history));
    }, 1400);
    return () => clearTimeout(id);
  }, [isComplete, summary, history, onComplete]);

  const progress = isComplete ? 1 : Math.min((questionNum - 1) / TOTAL_QUESTIONS, 0.95);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress */}
      <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-border-light">
        <motion.div className="h-full bg-gradient-primary"
          animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} disabled={isLoading}
          className="w-9 h-9 rounded-full bg-border-light flex items-center justify-center text-text-secondary disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">Знакомство</div>
          <div className="text-xs text-text-tertiary">
            {isComplete ? 'Профиль создан!' : `Вопрос ${questionNum} из ~${TOTAL_QUESTIONS}`}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 flex flex-col">
        {isComplete ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.15, 1] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-4xl shadow-primary"
            >
              ✅
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h2 className="text-2xl font-bold text-text-primary mb-1">Готово!</h2>
              <p className="text-sm text-text-secondary">Составляем ваш персональный план…</p>
            </motion.div>
          </motion.div>
        ) : (
          <>
            {/* История ответов (компактно) */}
            {history.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {history.slice(-3).map((qa, i) => (
                  <div key={i} className="flex justify-end">
                    <span className="bg-primary-light text-primary text-xs font-medium rounded-full px-3 py-1.5">{qa.answer}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Текущий вопрос */}
            <AnimatePresence mode="wait">
              <motion.div key={question}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }} className="mb-5">
                <div className="inline-flex items-center gap-1.5 bg-bg-muted rounded-full px-3 py-1 mb-3">
                  <span className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white text-[10px] font-bold">AI</span>
                  <span className="text-xs text-text-tertiary">спрашивает</span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary leading-tight whitespace-pre-wrap">{question}</h2>
              </motion.div>
            </AnimatePresence>

            {/* Загрузка */}
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} className="w-2.5 h-2.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.18 }} />
                  ))}
                </div>
                {status && <span className="text-sm text-text-tertiary">{status}</span>}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-danger text-center">{error}</p>
                <Button variant="outline" onClick={() => answer(lastAnswer)}>Повторить</Button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={`${question}-opts`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-2.5">
                  {options.map((opt, i) => (
                    <motion.button key={opt}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => answer(opt)}
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 border-border bg-bg-muted text-left hover:border-primary/40 active:scale-[0.98] transition-all">
                      <span className="font-medium text-text-primary text-[15px] flex-1">{opt}</span>
                      <span className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-text-tertiary">›</span>
                    </motion.button>
                  ))}

                  {/* Свой вариант — на случай, когда AI не прислал опций или нужен ввод */}
                  <div className="mt-2 flex flex-col gap-2">
                    {/* Suggested answers — быстрые ответы от AI */}
                    {suggestedAnswers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestedAnswers.map((sa) => (
                          <motion.button
                            key={sa}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => answer(sa)}
                            className="px-3 py-1.5 rounded-full bg-primary-light border border-primary/20 text-primary text-xs font-medium active:scale-95 transition-transform whitespace-nowrap"
                          >
                            {sa}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 items-end">
                      <textarea
                        value={custom}
                        onChange={e => setCustom(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); answer(custom); } }}
                        placeholder={options.length ? 'Или свой вариант…' : 'Введите ответ…'}
                        rows={1}
                        className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
                        style={{ maxHeight: 96 }}
                      />
                      <button onClick={() => answer(custom)} disabled={!custom.trim()}
                        className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </div>
  );
};
