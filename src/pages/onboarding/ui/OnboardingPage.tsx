import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { genId } from '@/shared/lib/genId';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { useAuthStore } from '@/entities/user/model/authStore';
import type { Account } from '@/entities/user/model/authStore';
import type { User, QuizAnswers } from '@/shared/types';
import { analyzeQuiz, quizGoalToFinancialGoal } from '../model/quiz';
import { Preloader } from './Preloader';
import { Features } from './Features';
import { AuthPhase } from './AuthPhase';
import { Quiz } from './Quiz';
import { OnboardingPlan } from './OnboardingPlan';

type Phase = 'preloader' | 'features' | 'auth' | 'quiz' | 'plan';

export const OnboardingPage = () => {
  const navigate           = useNavigate();
  const completeOnboarding = useUserStore(s => s.completeOnboarding);
  const saveProfile        = useAuthStore(s => s.saveProfile);

  const [phase, setPhase] = useState<Phase>('preloader');
  const account     = useRef<{ email: string; name: string }>({ email: '', name: '' });
  const quizDataRef = useRef<QuizAnswers | null>(null);

  // Квиз завершён → анализируем локально, показываем план
  const onQuizComplete = (answers: QuizAnswers) => {
    quizDataRef.current = answers;
    setPhase('plan');
  };

  // Экран плана → создаём пользователя и переходим на дашборд
  const finish = () => {
    const { email, name } = account.current;
    const answers  = quizDataRef.current;
    const analysis = answers ? analyzeQuiz(answers) : undefined;

    const user: User = {
      id: genId(),
      name,
      email,
      income:          answers?.income  ?? 0,
      goal:            answers ? quizGoalToFinancialGoal(answers.currentGoal) : 'other',
      goalLabel:       analysis?.personaLabel ?? 'Профиль создан',
      monthlyExpenses: 0,
      hasCredits:      answers ? answers.credits !== 'none' : false,
      hasCushion:      answers ? (answers.cushion === 'strong' || answers.cushion === 'some') : false,
      quiz:            answers ?? undefined,
      analysis,
      profileSummary:  analysis?.summary,
      createdAt:       new Date().toISOString(),
    };

    if (email) saveProfile(email, user);
    completeOnboarding(user);
    navigate('/dashboard', { replace: true });
  };

  const loginExisting = (acc: Account) => {
    if (acc.user) { completeOnboarding(acc.user); navigate('/dashboard', { replace: true }); }
  };

  // Plan — полноэкранный
  if (phase === 'plan') {
    const analysis = quizDataRef.current ? analyzeQuiz(quizDataRef.current) : undefined;
    return (
      <OnboardingPlan
        name={account.current.name}
        summary={analysis?.recommendations.join('. ') ?? analysis?.summary ?? ''}
        onEnter={finish}
      />
    );
  }

  return (
    <div className="w-full max-w-mobile h-dvh bg-white flex flex-col overflow-hidden relative mx-auto">
      <AnimatePresence mode="wait">
        <motion.div key={phase}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col">
          {phase === 'preloader' && <Preloader onDone={() => setPhase('features')} />}
          {phase === 'features'  && <Features  onDone={() => setPhase('auth')} />}
          {phase === 'auth' && (
            <AuthPhase
              onRegistered={(email, name) => { account.current = { email, name }; setPhase('quiz'); }}
              onLoginExisting={loginExisting}
            />
          )}
          {phase === 'quiz' && (
            <Quiz
              userName={account.current.name}
              onComplete={onQuizComplete}
              onBack={() => setPhase('auth')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
