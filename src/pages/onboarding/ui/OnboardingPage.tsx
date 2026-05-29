import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { useAuthStore } from '@/entities/user/model/authStore';
import type { Account } from '@/entities/user/model/authStore';
import type { QuizAnswers, User } from '@/shared/types';
import { analyzeQuiz, quizGoalToFinancialGoal } from '../model/quiz';
import { getGoalLabel } from '@/entities/user/model/goals';
import { Preloader } from './Preloader';
import { Features } from './Features';
import { AuthPhase } from './AuthPhase';
import { Quiz } from './Quiz';
import { UploadPhase } from './UploadPhase';
import { Analyzing } from './Analyzing';

type Phase = 'preloader' | 'features' | 'auth' | 'quiz' | 'upload' | 'analyzing';

// Rough spend ratio per "money left" answer — used to seed monthlyExpenses.
const SPEND_RATIO: Record<string, number> = {
  always: 0.6, often: 0.75, varies: 0.85, rarely: 0.95, never: 1.05,
};

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const completeOnboarding = useUserStore(s => s.completeOnboarding);
  const saveProfile = useAuthStore(s => s.saveProfile);

  const [phase, setPhase] = useState<Phase>('preloader');
  const account = useRef<{ email: string; name: string }>({ email: '', name: '' });
  const quizAnswers = useRef<QuizAnswers | null>(null);

  const finish = () => {
    const a = quizAnswers.current;
    const email = account.current.email;
    const name = account.current.name;

    const analysis = a ? analyzeQuiz(a) : undefined;
    const income = a?.income ?? 0;
    const goal = quizGoalToFinancialGoal(a?.currentGoal ?? 'no_goal');

    const user: User = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36),
      name,
      email,
      income,
      goal,
      goalLabel: getGoalLabel(goal),
      monthlyExpenses: Math.round(income * (SPEND_RATIO[a?.moneyLeft ?? 'varies'] ?? 0.85)),
      hasCredits: !!a && a.credits !== 'none',
      creditAmount: undefined,
      createdAt: new Date().toISOString(),
      quiz: a ?? undefined,
      analysis,
    };

    if (email) saveProfile(email, user);
    completeOnboarding(user);
    navigate('/dashboard', { replace: true });
  };

  const loginExisting = (acc: Account) => {
    if (acc.user) {
      completeOnboarding(acc.user);
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="w-full max-w-mobile h-dvh bg-white flex flex-col overflow-hidden relative mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          {phase === 'preloader' && <Preloader onDone={() => setPhase('features')} />}
          {phase === 'features' && <Features onDone={() => setPhase('auth')} />}
          {phase === 'auth' && (
            <AuthPhase
              onRegistered={(email, name) => {
                account.current = { email, name };
                setPhase('quiz');
              }}
              onLoginExisting={loginExisting}
            />
          )}
          {phase === 'quiz' && (
            <Quiz
              userName={account.current.name}
              onBack={() => setPhase('auth')}
              onComplete={a => {
                quizAnswers.current = a;
                setPhase('upload');
              }}
            />
          )}
          {phase === 'upload' && <UploadPhase onContinue={() => setPhase('analyzing')} />}
          {phase === 'analyzing' && <Analyzing onDone={finish} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
