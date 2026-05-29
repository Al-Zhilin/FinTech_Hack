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
  { id: 'google', label: 'Google', icon: 'G', color: 'text-[#EA4335]' },
  { id: 'apple', label: 'Apple', icon: '', color: 'text-text-primary' },
  { id: 'vk', label: 'VK', icon: 'VK', color: 'text-[#0077FF]' },
];

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
              <span className={s.color}>{s.icon || s.label}</span>
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
