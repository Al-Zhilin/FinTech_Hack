import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { genId } from '@/shared/lib/genId';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { useAuthStore } from '@/entities/user/model/authStore';
import type { Account } from '@/entities/user/model/authStore';
import type { User } from '@/shared/types';
import { Preloader } from './Preloader';
import { Features } from './Features';
import { AuthPhase } from './AuthPhase';
import { AIOnboarding } from './AIOnboarding';

type Phase = 'preloader' | 'features' | 'auth' | 'ai-onboarding';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const completeOnboarding = useUserStore(s => s.completeOnboarding);
  const saveProfile = useAuthStore(s => s.saveProfile);

  const [phase, setPhase] = useState<Phase>('preloader');
  const account = useRef<{ email: string; name: string }>({ email: '', name: '' });

  const finish = () => {
    const email = account.current.email;
    const name = account.current.name;

    const user: User = {
      id: genId(),
      name,
      email,
      income: 0,
      goal: 'other',
      goalLabel: 'Профиль создан',
      monthlyExpenses: 0,
      hasCredits: false,
      createdAt: new Date().toISOString(),
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
                setPhase('ai-onboarding');
              }}
              onLoginExisting={loginExisting}
            />
          )}
          {phase === 'ai-onboarding' && (
            <AIOnboarding
              userLogin={account.current.email}
              onBack={() => setPhase('auth')}
              onComplete={finish}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
