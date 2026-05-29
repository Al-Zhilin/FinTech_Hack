import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useAuthStore } from '@/entities/user/model/authStore';
import type { Account } from '@/entities/user/model/authStore';
import { Logo } from './Logo';


interface AuthPhaseProps {
  onRegistered: (email: string, name: string) => void;
  onLoginExisting: (account: Account) => void;
}

const SOCIALS = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg
        width="54"
        height="54"
        viewBox="0 0 158 158"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="158" height="158" rx="79" fill="white" />
        <path d="M130.951 79.9916C130.951 75.6488 130.597 72.4798 129.831 69.1934H80.0361V88.7945H109.265C108.676 93.6656 105.493 101.001 98.4218 105.931L98.3227 106.587L114.067 118.734L115.158 118.842C125.175 109.628 130.951 96.0716 130.951 79.9916Z" fill="#4285F4" />
        <path d="M80.0361 131.636C94.3556 131.636 106.377 126.941 115.158 118.842L98.4218 105.931C93.9433 109.041 87.9324 111.213 80.0361 111.213C66.0112 111.213 54.1076 101.999 49.8644 89.2642L49.2424 89.3168L32.8713 101.934L32.6572 102.527C41.3786 119.781 59.293 131.636 80.0361 131.636Z" fill="#34A853" />
        <path d="M49.8642 89.2641C48.7445 85.9777 48.0966 82.4562 48.0966 78.8178C48.0966 75.179 48.7445 71.658 49.8053 68.3716L49.7756 67.6717L33.1994 54.8513L32.657 55.1082C29.0625 62.2681 27 70.3083 27 78.8178C27 87.3274 29.0625 95.3672 32.657 102.527L49.8642 89.2641Z" fill="#FBBC05" />
        <path d="M80.0361 46.4228C89.995 46.4228 96.7127 50.7069 100.543 54.287L115.511 39.7327C106.318 31.2231 94.3556 26 80.0361 26C59.293 26 41.3786 37.8546 32.6572 55.1083L49.8055 68.3717C54.1076 55.6367 66.0112 46.4228 80.0361 46.4228Z" fill="#EB4335" />
      </svg>
    ),
  },

  {
    id: 'apple',
    label: 'Apple',
    icon: (
      <svg
        width="54"
        height="54"
        viewBox="0 0 158 158"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="158" height="158" rx="79" fill="white" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M94.1186 44.4854C97.6546 40.3872 100.038 34.6792 99.3858 29C94.2902 29.194 88.1255 32.255 84.4718 36.3484C81.1909 39.981 78.3268 45.7853 79.0968 51.353C84.7808 51.7749 90.5826 48.5884 94.1186 44.4854ZM106.865 80.531C107.007 95.2117 120.303 100.095 120.45 100.158C120.342 100.503 118.326 107.117 113.446 113.955C109.224 119.862 104.844 125.746 97.9439 125.872C91.1662 125.993 88.9838 122.021 81.2301 122.021C73.4814 122.021 71.0586 125.745 64.6438 125.993C57.9838 126.23 52.9079 119.601 48.6559 113.714C39.9557 101.671 33.3104 79.6827 42.2362 64.842C46.6697 57.475 54.5901 52.8027 63.1922 52.6863C69.7296 52.565 75.9041 56.9016 79.9011 56.9016C83.8981 56.9016 91.4016 51.6879 99.2877 52.4542C102.588 52.5852 111.857 53.7293 117.806 62.076C117.326 62.3622 106.747 68.2608 106.865 80.531Z"
          fill="black"
        />
      </svg>
    ),
  },

  {
    id: 'vk',
    label: 'VK',
    icon: (
      <svg
        width="54"
        height="54"
        viewBox="0 0 158 158"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="158" height="158" rx="79" fill="white" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M125.767 53.8921C126.449 51.6026 125.767 50 122.582 50H111.969C109.239 50 108.026 51.45 107.344 53.0526C107.344 53.0526 101.961 66.3316 94.3041 74.8789C91.8023 77.3974 90.7409 78.1605 89.3763 78.1605C88.6939 78.1605 87.7084 77.3974 87.7084 75.1079V53.8921C87.7084 51.1447 86.9502 50 84.6758 50H67.9969C66.329 50 65.2676 51.2974 65.2676 52.4421C65.2676 55.0368 69.0583 55.6474 69.5132 62.8211V78.5421C69.5132 81.9763 68.9067 82.5868 67.542 82.5868C63.9788 82.5868 55.1844 69.3079 50.0291 54.0447C48.9678 51.2211 47.9822 50 45.2529 50H34.639C31.6065 50 31 51.45 31 53.0526C31 55.8763 34.5632 69.9184 47.7547 88.4632C56.5491 101.132 68.9067 108 80.127 108C86.8744 108 87.7084 106.474 87.7084 103.879V94.2632C87.7084 91.2105 88.3149 90.6 90.5135 90.6C92.1055 90.6 94.759 91.3632 101.052 97.4684C108.254 104.718 109.467 108 113.485 108H124.099C127.131 108 128.648 106.474 127.738 103.497C126.752 100.521 123.341 96.1711 118.792 90.9816C116.29 88.0053 112.575 84.8763 111.514 83.2737C109.922 81.2132 110.377 80.2974 111.514 78.5421C111.514 78.4658 124.478 60.15 125.767 53.8921Z"
          fill="#5181B8"
        />
      </svg>
    ),
  },
];

// const SOCIALS = [
//   { id: 'google', label: 'Google', icon: 'G', color: '' },
//   { id: 'apple', label: 'Apple', icon: '', color: 'text-text-primary' },
//   { id: 'vk', label: 'VK', icon: 'VK', color: 'text-[#0077FF]' },
// ];

export const AuthPhase = ({ onRegistered, onLoginExisting }: AuthPhaseProps) => {
  const register = useAuthStore(s => s.register);
  const login = useAuthStore(s => s.login);

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [socialHint, setSocialHint] = useState('');

  const isRegister = mode === 'register';
  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (!isRegister || name.trim().length >= 2);

  const submit = () => {
    setError('');
    if (isRegister) {
      const res = register(email, name, password);
      if (!res.ok) return setError(res.error ?? 'Ошибка регистрации');
      onRegistered(res.account!.email, res.account!.name);
    } else {
      const res = login(email, password);
      if (!res.ok) return setError(res.error ?? 'Ошибка входа');
      const acc = res.account!;
      if (acc.onboardingDone && acc.user) onLoginExisting(acc);
      else onRegistered(acc.email, acc.name);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 pt-12 pb-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={64} />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isRegister ? 'Создать аккаунт' : 'С возвращением'}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {isRegister ? 'Чтобы сохранять прогресс и анализ' : 'Войдите в свой аккаунт'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {isRegister && (
            <Input
              label="Имя"
              placeholder="Например, Иван"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <Input
            label="Email"
            placeholder="you@example.com"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            label="Пароль"
            placeholder="Минимум 6 символов"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            hint={isRegister ? 'Минимум 6 символов' : undefined}
          />
          {error && <p className="text-sm text-danger -mt-1">{error}</p>}
        </div>

        <Button size="lg" fullWidth onClick={submit} disabled={!canSubmit}>
          {isRegister ? 'Зарегистрироваться' : 'Войти'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-tertiary">или быстрее</span>
          <span className="flex-1 h-px bg-border" />
        </div>

        {/* Social (non-functional) */}
        <div className="grid grid-cols-3 gap-3">
          {SOCIALS.map(s => (
            <button
              key={s.id}
              onClick={() => setSocialHint('Скоро будет доступно')}
              className="h-12 rounded-lg border border-border bg-white flex items-center justify-center font-bold text-base active:scale-[0.97] transition-transform"
            >
              {s.icon}
            </button>
          ))}
        </div>
        {socialHint && <p className="text-xs text-center text-text-tertiary -mt-2">{socialHint}</p>}

        <button
          onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}
          className="text-primary font-semibold text-sm py-1"
        >
          {isRegister ? 'У меня уже есть аккаунт' : 'Создать новый аккаунт'}
        </button>
      </motion.div>
    </div>
  );
};
