import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Wallet, CreditCard, Bell, Moon, ShieldCheck, Globe,
  HelpCircle, Star, LogOut, Camera, Pencil, TrendingUp, TrendingDown,
  ChevronRight, Check, Trash2,
} from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { GOAL_OPTIONS } from '@/entities/user/model/goals';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { formatCurrency } from '@/shared/lib/formatters';
import type { FinancialGoal } from '@/shared/types';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

type SheetId = 'name' | 'income' | 'goal' | 'budget' | 'credit' | 'language' | 'photo' | null;

// ─── Toggle switch ─────────────────────────────────────────────────────────────

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${on ? 'bg-primary' : 'bg-border'}`}
    aria-pressed={on}
  >
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
  </button>
);

// ─── Setting row ───────────────────────────────────────────────────────────────

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

const Row = ({ icon, label, value, badge, trailing, onPress, danger }: RowProps) => {
  const Comp = onPress ? 'button' : 'div';
  return (
    <Comp
      onClick={onPress}
      className={`flex items-center gap-3 w-full py-3.5 px-5 text-left transition-colors ${onPress ? 'hover:bg-bg-muted active:bg-border-light' : ''}`}
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-danger-light text-danger' : 'bg-bg-muted text-text-primary'}`}>
        {icon}
      </span>
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-danger' : 'text-text-primary'}`}>
        {label}
      </span>
      {value && <span className="text-sm text-text-tertiary">{value}</span>}
      {badge}
      {trailing}
      {onPress && !trailing && <ChevronRight size={16} className="text-text-tertiary" />}
    </Comp>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useUserStore(s => s.user);
  const updateUser = useUserStore(s => s.updateUser);
  const logout = useUserStore(s => s.logout);

  const [sheet, setSheet] = useState<SheetId>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local draft state for input sheets
  const [draft, setDraft] = useState('');

  if (!user) return null;

  const notificationsOn = user.notificationsEnabled ?? true;
  const darkOn = user.darkMode ?? false;
  const language = user.language ?? 'ru';

  const close = () => setSheet(null);
  const openInput = (id: SheetId, initial: string) => { setDraft(initial); setSheet(id); };

  const handleLogout = () => {
    logout();
    navigate('/onboarding', { replace: true });
  };

  // ── Photo handling ──
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateUser({ avatar: reader.result as string });
      close();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = () => { updateUser({ avatar: undefined }); close(); };

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <motion.div
      className="flex flex-col bg-bg-base min-h-full"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-12 pb-6 border-b border-border-light">
        <motion.div variants={item} className="flex items-center gap-4">
          <div className="relative">
            <button onClick={() => setSheet('photo')} className="block">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar"
                     className="w-20 h-20 rounded-full object-cover shadow-primary" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-primary">
                  {initials}
                </div>
              )}
            </button>
            <button
              onClick={() => setSheet('photo')}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full border-2 border-border-light flex items-center justify-center shadow-card text-text-primary"
            >
              <Camera size={13} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => openInput('name', user.name)} className="flex items-center gap-1.5 text-left">
              <h1 className="text-xl font-bold text-text-primary truncate">{user.name}</h1>
              <Pencil size={14} className="text-text-tertiary flex-shrink-0" />
            </button>
            <p className="text-text-tertiary text-sm">Доход: {formatCurrency(user.income, true)} / мес</p>
            <div className="mt-1.5">
              <Badge variant="primary">{user.goalLabel}</Badge>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div variants={item} className="flex gap-3 mt-5">
          <div className="flex-1 bg-success-light rounded-xl p-3 text-center">
            <TrendingUp size={16} className="text-success mx-auto mb-1" />
            <p className="text-sm font-bold text-success">{formatCurrency(user.income, true)}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">Доход</p>
          </div>
          <div className="flex-1 bg-bg-muted rounded-xl p-3 text-center">
            <TrendingDown size={16} className="text-text-primary mx-auto mb-1" />
            <p className="text-sm font-bold text-text-primary">{formatCurrency(user.monthlyExpenses, true)}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">Расходы</p>
          </div>
          <div className="flex-1 bg-warning-light rounded-xl p-3 text-center">
            <CreditCard size={16} className="text-warning mx-auto mb-1" />
            <p className="text-sm font-bold text-warning">{user.hasCredits ? formatCurrency(user.creditAmount ?? 0, true) : 'Нет'}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">Кредиты</p>
          </div>
        </motion.div>
      </div>

      {/* ── Финансы ── */}
      <motion.div variants={item} className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">Финансы</p>
      </motion.div>
      <motion.div variants={item}>
        <Card variant="default" padding="none" className="mx-5 overflow-hidden divide-y divide-border-light">
          <Row icon={<Target size={18} />} label="Моя цель" value={user.goalLabel} onPress={() => setSheet('goal')} />
          <Row icon={<Wallet size={18} />} label="Бюджет на месяц" value={formatCurrency(user.monthlyExpenses)} onPress={() => openInput('budget', String(user.monthlyExpenses))} />
          <Row icon={<TrendingUp size={18} />} label="Ежемесячный доход" value={formatCurrency(user.income)} onPress={() => openInput('income', String(user.income))} />
          <Row icon={<CreditCard size={18} />} label="Кредитная нагрузка" value={user.hasCredits ? formatCurrency(user.creditAmount ?? 0) : 'Нет'} onPress={() => openInput('credit', String(user.creditAmount ?? 0))} />
          <Row icon={<Bell size={18} />} label="Уведомления"
               trailing={<Toggle on={notificationsOn} onToggle={() => updateUser({ notificationsEnabled: !notificationsOn })} />} />
        </Card>
      </motion.div>

      {/* ── Приложение ── */}
      <motion.div variants={item} className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">Приложение</p>
      </motion.div>
      <motion.div variants={item}>
        <Card variant="default" padding="none" className="mx-5 overflow-hidden divide-y divide-border-light">
          <Row icon={<Moon size={18} />} label="Тёмная тема"
               trailing={<Toggle on={darkOn} onToggle={() => updateUser({ darkMode: !darkOn })} />} />
          <Row icon={<Globe size={18} />} label="Язык" value={language === 'ru' ? 'Русский' : 'English'} onPress={() => setSheet('language')} />
          <Row icon={<ShieldCheck size={18} />} label="Безопасность" onPress={() => {}} />
          <Row icon={<HelpCircle size={18} />} label="Помощь и поддержка" onPress={() => {}} />
          <Row icon={<Star size={18} />} label="Оценить приложение" onPress={() => {}} />
        </Card>
      </motion.div>

      {/* ── App info ── */}
      <motion.div variants={item} className="px-5 pt-4">
        <div className="flex items-center justify-between bg-bg-muted rounded-xl px-4 py-3">
          <div>
            <p className="font-semibold text-sm text-text-primary">Экватор</p>
            <p className="text-xs text-text-tertiary">Версия 1.0.0 · Финансовый помощник</p>
          </div>
          <div className="text-2xl">🌊</div>
        </div>
      </motion.div>

      {/* ── Logout ── */}
      <motion.div variants={item} className="px-5 pt-4 pb-8">
        <Card variant="default" padding="none" className="overflow-hidden">
          <Row icon={<LogOut size={18} />} label="Выйти из аккаунта" onPress={handleLogout} danger />
        </Card>
        <p className="text-xs text-center text-text-tertiary mt-4">
          Данные сохранены локально на устройстве
        </p>
      </motion.div>

      {/* ─── Sheets ─────────────────────────────────────────────────────────── */}

      {/* Name */}
      <BottomSheet open={sheet === 'name'} onClose={close} title="Ваше имя">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Имя" autoFocus />
        <Button fullWidth className="mt-4" disabled={draft.trim().length < 2}
                onClick={() => { updateUser({ name: draft.trim() }); close(); }}>
          Сохранить
        </Button>
      </BottomSheet>

      {/* Income */}
      <BottomSheet open={sheet === 'income'} onClose={close} title="Ежемесячный доход">
        <Input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)}
               suffix={<span className="text-sm font-medium text-text-secondary">₽</span>} autoFocus />
        <Button fullWidth className="mt-4" disabled={!Number(draft)}
                onClick={() => { updateUser({ income: Number(draft) }); close(); }}>
          Сохранить
        </Button>
      </BottomSheet>

      {/* Budget / expenses */}
      <BottomSheet open={sheet === 'budget'} onClose={close} title="Бюджет на месяц">
        <Input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)}
               suffix={<span className="text-sm font-medium text-text-secondary">₽</span>} autoFocus />
        <Button fullWidth className="mt-4" disabled={!Number(draft)}
                onClick={() => { updateUser({ monthlyExpenses: Number(draft) }); close(); }}>
          Сохранить
        </Button>
      </BottomSheet>

      {/* Credit load */}
      <BottomSheet open={sheet === 'credit'} onClose={close} title="Кредитная нагрузка">
        <p className="text-sm text-text-secondary mb-3">Ежемесячный платёж по всем кредитам. Укажите 0, если кредитов нет.</p>
        <Input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)}
               suffix={<span className="text-sm font-medium text-text-secondary">₽</span>} autoFocus />
        <Button fullWidth className="mt-4"
                onClick={() => { const amt = Number(draft) || 0; updateUser({ creditAmount: amt, hasCredits: amt > 0 }); close(); }}>
          Сохранить
        </Button>
      </BottomSheet>

      {/* Goal picker */}
      <BottomSheet open={sheet === 'goal'} onClose={close} title="Финансовая цель">
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {GOAL_OPTIONS.map(g => {
            const selected = user.goal === g.value;
            return (
              <button
                key={g.value}
                onClick={() => { updateUser({ goal: g.value as FinancialGoal, goalLabel: g.label }); close(); }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${selected ? 'border-primary bg-primary-light' : 'border-border bg-bg-muted'}`}
              >
                <span className="text-2xl">{g.icon}</span>
                <span className="flex-1">
                  <span className="block font-semibold text-sm text-text-primary">{g.label}</span>
                  <span className="block text-xs text-text-tertiary">{g.desc}</span>
                </span>
                {selected && <Check size={18} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Language */}
      <BottomSheet open={sheet === 'language'} onClose={close} title="Язык">
        <div className="flex flex-col gap-2">
          {([['ru', 'Русский', '🇷🇺'], ['en', 'English', '🇬🇧']] as const).map(([code, label, flag]) => {
            const selected = language === code;
            return (
              <button key={code}
                onClick={() => { updateUser({ language: code }); close(); }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${selected ? 'border-primary bg-primary-light' : 'border-border bg-bg-muted'}`}>
                <span className="text-2xl">{flag}</span>
                <span className="flex-1 font-semibold text-sm text-text-primary">{label}</span>
                {selected && <Check size={18} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Photo */}
      <BottomSheet open={sheet === 'photo'} onClose={close} title="Фото профиля">
        <div className="flex flex-col gap-2">
          <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-muted text-left">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-text-primary"><Camera size={18} /></span>
            <span className="font-semibold text-sm text-text-primary">{user.avatar ? 'Заменить фото' : 'Загрузить фото'}</span>
          </button>
          {user.avatar && (
            <button onClick={removePhoto}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-danger-light text-left">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-danger"><Trash2 size={18} /></span>
              <span className="font-semibold text-sm text-danger">Удалить фото</span>
            </button>
          )}
        </div>
      </BottomSheet>
    </motion.div>
  );
};
