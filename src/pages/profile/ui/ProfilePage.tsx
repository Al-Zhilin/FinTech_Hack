import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Wallet, CreditCard, Bell, Moon, ShieldCheck, Globe, Coins,
  HelpCircle, LogOut, Camera, Pencil, TrendingUp, TrendingDown, FileSpreadsheet,
  Send, QrCode, BookOpen, CalendarDays, ChevronRight, Check, Trash2, GraduationCap,
  Fingerprint, Lock, RefreshCw,
} from 'lucide-react';
import { useUserStore } from '@/entities/user/model/userStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { GOAL_OPTIONS } from '@/entities/user/model/goals';
import { getFinancialDna, getFinancialLevel } from '@/entities/profile/model/financialDna';
import { LITERACY_CARDS, type LiteracyCard } from '@/entities/profile/model/literacy';
import { buildWeeklyRecaps } from '@/entities/profile/model/weeklyRecap';
import { useSourcesStore, type SourceId } from '@/entities/profile/model/sourcesStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useSettingsStore, CURRENCIES_LIST } from '@/shared/config/settingsStore';
import { useT } from '@/shared/config/i18n';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { formatCurrency, CURRENCIES } from '@/shared/lib/formatters';
import type { FinancialGoal } from '@/shared/types';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

type SheetId =
  | 'name' | 'income' | 'goal' | 'budget' | 'credit' | 'language' | 'currency'
  | 'photo' | 'sources' | 'library' | 'recap' | 'security' | 'tutorial' | null;

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button onClick={onToggle}
    className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${on ? 'bg-primary' : 'bg-border'}`}>
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
  </button>
);

interface RowProps {
  icon: React.ReactNode; label: string; value?: string;
  trailing?: React.ReactNode; onPress?: () => void; danger?: boolean;
}
const Row = ({ icon, label, value, trailing, onPress, danger }: RowProps) => {
  const Comp = onPress ? 'button' : 'div';
  return (
    <Comp onClick={onPress}
      className={`flex items-center gap-3 w-full py-3.5 px-5 text-left transition-colors ${onPress ? 'hover:bg-bg-muted active:bg-border-light' : ''}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-danger-light text-danger' : 'bg-bg-muted text-text-primary'}`}>{icon}</span>
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-danger' : 'text-text-primary'}`}>{label}</span>
      {value && <span className="text-sm text-text-tertiary">{value}</span>}
      {trailing}
      {onPress && !trailing && <ChevronRight size={16} className="text-text-tertiary" />}
    </Comp>
  );
};

const SourceMeta: Record<SourceId, { icon: React.ReactNode; label: string; hint: string }> = {
  csv:      { icon: <FileSpreadsheet size={18} />, label: 'CSV-выписка',  hint: 'Импорт из файла банка' },
  telegram: { icon: <Send size={18} />,            label: 'Telegram-бот', hint: 'Пересылайте чеки боту' },
  qr:       { icon: <QrCode size={18} />,          label: 'QR чеков',     hint: 'Сканирование ФНС-чеков' },
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const t = useT();
  const user = useUserStore(s => s.user);
  const updateUser = useUserStore(s => s.updateUser);
  const logout = useUserStore(s => s.logout);
  const profile = useFinanceStore(s => s.profile);
  const { txs: userTx } = useUserTxStore();
  const { lang, currency, setLang, setCurrency } = useSettingsStore();
  const sources = useSourcesStore();

  const [sheet, setSheet] = useState<SheetId>(null);
  const [draft, setDraft] = useState('');
  const [card, setCard] = useState<LiteracyCard | null>(null);
  const [recapIdx, setRecapIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const dna = useMemo(() => getFinancialDna(user, profile), [user, profile]);
  const level = useMemo(() => getFinancialLevel(user, profile, userTx.length), [user, profile, userTx.length]);
  const recaps = useMemo(() => buildWeeklyRecaps(userTx), [userTx]);

  if (!user) return null;

  const notificationsOn = user.notificationsEnabled ?? true;
  const darkOn = user.darkMode ?? false;
  const close = () => setSheet(null);
  const openInput = (id: SheetId, initial: string) => { setDraft(initial); setSheet(id); };

  const handleLogout = () => { logout(); navigate('/onboarding', { replace: true }); };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { updateUser({ avatar: reader.result as string }); close(); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onPickCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result).split('\n').filter(Boolean).length;
      sources.setCsvRows(Math.max(0, rows - 1));
      sources.connect('csv');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const curMeta = CURRENCIES[currency];

  return (
    <motion.div className="flex flex-col bg-bg-base min-h-full pb-8" variants={container} initial="hidden" animate="show">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onPickCsv} />

      {/* ── Header: avatar + DNA + level ── */}
      <div className="bg-white px-5 pt-12 pb-6 border-b border-border-light">
        <motion.div variants={item} className="flex items-center gap-4">
          <div className="relative">
            <button onClick={() => setSheet('photo')} className="block">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover shadow-primary" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-primary">{initials}</div>
              )}
            </button>
            <button onClick={() => setSheet('photo')}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full border-2 border-border-light flex items-center justify-center shadow-card text-text-primary">
              <Camera size={13} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => openInput('name', user.name)} className="flex items-center gap-1.5 text-left">
              <h1 className="text-xl font-bold text-text-primary truncate">{user.name}</h1>
              <Pencil size={14} className="text-text-tertiary flex-shrink-0" />
            </button>
            <p className="text-text-tertiary text-sm">{t('profile.income')}: {formatCurrency(user.income, true)} / {t('profile.month')}</p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-purple/10 text-purple rounded-full px-2.5 py-1">
              <span>{dna.emoji}</span>
              <span className="text-xs font-bold">{dna.type}</span>
            </div>
          </div>
        </motion.div>

        {/* DNA blurb + financial level */}
        <motion.div variants={item} className="mt-4 rounded-2xl p-4 bg-gradient-card-purple border border-purple/15">
          <p className="text-xs text-text-secondary mb-3">{dna.blurb}</p>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-text-primary">{t('profile.level')} {level.level} · {level.title}</span>
            <span className="text-xs text-text-tertiary">
              {userTx.length === 0 && profile.stressScore >= 100 ? 'Нет данных' : `Индекс ${level.health}/100`}
            </span>
          </div>
          <ProgressBar value={level.progress} color="purple" size="sm" />
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="flex gap-3 mt-4">
          <div className="flex-1 bg-success-light rounded-xl p-3 text-center">
            <TrendingUp size={16} className="text-success mx-auto mb-1" />
            <p className="text-sm font-bold text-success">{formatCurrency(user.income, true)}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{t('profile.income')}</p>
          </div>
          <div className="flex-1 bg-bg-muted rounded-xl p-3 text-center">
            <TrendingDown size={16} className="text-text-primary mx-auto mb-1" />
            <p className="text-sm font-bold text-text-primary">{formatCurrency(user.monthlyExpenses, true)}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{t('profile.expenses')}</p>
          </div>
          <div className="flex-1 bg-warning-light rounded-xl p-3 text-center">
            <CreditCard size={16} className="text-warning mx-auto mb-1" />
            <p className="text-sm font-bold text-warning">{user.hasCredits ? formatCurrency(user.creditAmount ?? 0, true) : t('profile.none')}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{t('profile.credits')}</p>
          </div>
        </motion.div>
      </div>

      {/* ── Финансы ── */}
      <motion.div variants={item} className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">{t('profile.finance')}</p>
      </motion.div>
      <motion.div variants={item}>
        <Card variant="default" padding="none" className="mx-5 overflow-hidden divide-y divide-border-light">
          <Row icon={<Target size={18} />} label="Моя цель" value={user.goalLabel} onPress={() => setSheet('goal')} />
          <Row icon={<Wallet size={18} />} label="Бюджет на месяц" value={formatCurrency(user.monthlyExpenses)} onPress={() => openInput('budget', String(user.monthlyExpenses))} />
          <Row icon={<TrendingUp size={18} />} label="Ежемесячный доход" value={formatCurrency(user.income)} onPress={() => openInput('income', String(user.income))} />
          <Row icon={<CreditCard size={18} />} label="Кредитная нагрузка" value={user.hasCredits ? formatCurrency(user.creditAmount ?? 0) : t('profile.none')} onPress={() => openInput('credit', String(user.creditAmount ?? 0))} />
        </Card>
      </motion.div>

      {/* ── Данные и обучение ── */}
      <motion.div variants={item} className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">{t('profile.data')}</p>
      </motion.div>
      <motion.div variants={item}>
        <Card variant="default" padding="none" className="mx-5 overflow-hidden divide-y divide-border-light">
          <Row icon={<RefreshCw size={18} />} label={t('profile.sources')}
            value={`${Object.values(sources.connected).filter(Boolean).length}/3`} onPress={() => setSheet('sources')} />
          <Row icon={<BookOpen size={18} />} label={t('profile.library')}
            value={`${LITERACY_CARDS.length}`} onPress={() => { setCard(null); setSheet('library'); }} />
          <Row icon={<CalendarDays size={18} />} label={t('profile.recap')}
            value={`${recaps.length}`} onPress={() => { setRecapIdx(null); setSheet('recap'); }} />
        </Card>
      </motion.div>

      {/* ── Приложение ── */}
      <motion.div variants={item} className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">{t('profile.app')}</p>
      </motion.div>
      <motion.div variants={item}>
        <Card variant="default" padding="none" className="mx-5 overflow-hidden divide-y divide-border-light">
          <Row icon={<Bell size={18} />} label={t('profile.notifications')}
            trailing={<Toggle on={notificationsOn} onToggle={() => updateUser({ notificationsEnabled: !notificationsOn })} />} />
          <Row icon={<Moon size={18} />} label="Тёмная тема"
            trailing={<Toggle on={darkOn} onToggle={() => updateUser({ darkMode: !darkOn })} />} />
          <Row icon={<Globe size={18} />} label={t('profile.language')} value={lang === 'ru' ? 'Русский' : 'English'} onPress={() => setSheet('language')} />
          <Row icon={<Coins size={18} />} label={t('profile.currency')} value={`${curMeta.symbol} ${currency}`} onPress={() => setSheet('currency')} />
          <Row icon={<ShieldCheck size={18} />} label={t('profile.security')} onPress={() => setSheet('security')} />
          <Row icon={<GraduationCap size={18} />} label={t('profile.tutorial')} onPress={() => setSheet('tutorial')} />
          <Row icon={<HelpCircle size={18} />} label="Помощь и поддержка" onPress={() => {}} />
        </Card>
      </motion.div>

      {/* ── Logout ── */}
      <motion.div variants={item} className="px-5 pt-5">
        <Card variant="default" padding="none" className="overflow-hidden">
          <Row icon={<LogOut size={18} />} label={t('profile.logout')} onPress={handleLogout} danger />
        </Card>
        <p className="text-xs text-center text-text-tertiary mt-4">Данные сохранены локально на устройстве · v1.0.0</p>
      </motion.div>

      {/* ═══ Sheets ═══ */}

      <BottomSheet open={sheet === 'name'} onClose={close} title="Ваше имя">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Имя" autoFocus />
        <Button fullWidth className="mt-4" disabled={draft.trim().length < 2} onClick={() => { updateUser({ name: draft.trim() }); close(); }}>{t('common.save')}</Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'income'} onClose={close} title="Ежемесячный доход">
        <Input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} suffix={<span className="text-sm font-medium text-text-secondary">₽</span>} autoFocus />
        <Button fullWidth className="mt-4" disabled={!Number(draft)} onClick={() => { updateUser({ income: Number(draft) }); close(); }}>{t('common.save')}</Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'budget'} onClose={close} title="Бюджет на месяц">
        <Input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} suffix={<span className="text-sm font-medium text-text-secondary">₽</span>} autoFocus />
        <Button fullWidth className="mt-4" disabled={!Number(draft)} onClick={() => { updateUser({ monthlyExpenses: Number(draft) }); close(); }}>{t('common.save')}</Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'credit'} onClose={close} title="Кредитная нагрузка">
        <p className="text-sm text-text-secondary mb-3">Ежемесячный платёж по всем кредитам. 0 — если кредитов нет.</p>
        <Input type="number" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} suffix={<span className="text-sm font-medium text-text-secondary">₽</span>} autoFocus />
        <Button fullWidth className="mt-4" onClick={() => { const amt = Number(draft) || 0; updateUser({ creditAmount: amt, hasCredits: amt > 0 }); close(); }}>{t('common.save')}</Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'goal'} onClose={close} title="Финансовая цель">
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {GOAL_OPTIONS.map(g => {
            const selected = user.goal === g.value;
            return (
              <button key={g.value} onClick={() => { updateUser({ goal: g.value as FinancialGoal, goalLabel: g.label }); close(); }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${selected ? 'border-primary bg-primary-light' : 'border-border bg-bg-muted'}`}>
                <span className="text-2xl">{g.icon}</span>
                <span className="flex-1"><span className="block font-semibold text-sm text-text-primary">{g.label}</span><span className="block text-xs text-text-tertiary">{g.desc}</span></span>
                {selected && <Check size={18} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Language */}
      <BottomSheet open={sheet === 'language'} onClose={close} title={t('profile.language')}>
        <div className="flex flex-col gap-2">
          {([['ru', 'Русский', '🇷🇺'], ['en', 'English', '🇬🇧']] as const).map(([code, label, flag]) => (
            <button key={code} onClick={() => { setLang(code); close(); }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${lang === code ? 'border-primary bg-primary-light' : 'border-border bg-bg-muted'}`}>
              <span className="text-2xl">{flag}</span>
              <span className="flex-1 font-semibold text-sm text-text-primary">{label}</span>
              {lang === code && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Currency */}
      <BottomSheet open={sheet === 'currency'} onClose={close} title={t('profile.currency')}>
        <p className="text-sm text-text-secondary mb-3">Все суммы в приложении пересчитаются мгновенно.</p>
        <div className="flex flex-col gap-2">
          {CURRENCIES_LIST.map(c => (
            <button key={c.code} onClick={() => { setCurrency(c.code); close(); }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${currency === c.code ? 'border-primary bg-primary-light' : 'border-border bg-bg-muted'}`}>
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg font-bold">{CURRENCIES[c.code].symbol}</span>
              <span className="flex-1"><span className="block font-semibold text-sm text-text-primary">{c.label}</span><span className="block text-xs text-text-tertiary">{c.code}</span></span>
              {currency === c.code && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Photo */}
      <BottomSheet open={sheet === 'photo'} onClose={close} title="Фото профиля">
        <div className="flex flex-col gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-muted text-left">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-text-primary"><Camera size={18} /></span>
            <span className="font-semibold text-sm text-text-primary">{user.avatar ? 'Заменить фото' : 'Загрузить фото'}</span>
          </button>
          {user.avatar && (
            <button onClick={() => { updateUser({ avatar: undefined }); close(); }} className="flex items-center gap-3 p-3.5 rounded-xl bg-danger-light text-left">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-danger"><Trash2 size={18} /></span>
              <span className="font-semibold text-sm text-danger">Удалить фото</span>
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Data sources */}
      <BottomSheet open={sheet === 'sources'} onClose={close} title={t('profile.sources')}>
        <div className="flex flex-col gap-2.5">
          {(Object.keys(SourceMeta) as SourceId[]).map(id => {
            const meta = SourceMeta[id];
            const on = sources.connected[id];
            return (
              <div key={id} className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-muted">
                <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-primary">{meta.label}</p>
                  <p className="text-xs text-text-tertiary">
                    {id === 'csv' && on && sources.lastCsvRows !== undefined
                      ? `Импортировано строк: ${sources.lastCsvRows}`
                      : on ? t('common.connected') : meta.hint}
                  </p>
                </div>
                {on ? (
                  <button onClick={() => sources.disconnect(id)} className="text-xs font-semibold text-danger px-3 py-1.5">Отключить</button>
                ) : (
                  <button
                    onClick={() => id === 'csv' ? csvRef.current?.click() : sources.connect(id)}
                    className="text-xs font-semibold text-white bg-gradient-primary rounded-full px-3 py-1.5">
                    {id === 'csv' ? 'Файл' : 'Подключить'}
                  </button>
                )}
              </div>
            );
          })}
          {sources.connected.qr && (
            <div className="flex flex-col items-center gap-2 p-4 bg-bg-muted rounded-xl">
              <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center"><QrCode size={64} className="text-text-primary" /></div>
              <p className="text-xs text-text-tertiary text-center">Наведите камеру банка/ФНС на QR, чтобы привязать чеки</p>
            </div>
          )}
          {sources.connected.telegram && (
            <p className="text-xs text-text-secondary text-center">Откройте <span className="font-semibold text-primary">@ekvator_bot</span> и пришлите чек — операция появится автоматически.</p>
          )}
        </div>
      </BottomSheet>

      {/* Literacy library */}
      <BottomSheet open={sheet === 'library'} onClose={close} title={card ? card.title : t('profile.library')}>
        {card ? (
          <div className="flex flex-col gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-3xl mx-auto">{card.emoji}</div>
            <div className="text-center">
              <Badge variant="muted">{card.category} · ~{card.readSec} сек</Badge>
            </div>
            <p className="text-text-secondary text-[15px] leading-relaxed text-center">{card.body}</p>
            <Button variant="outline" fullWidth onClick={() => setCard(null)}>← К библиотеке</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 max-h-[62vh] overflow-y-auto">
            {LITERACY_CARDS.map(c => (
              <button key={c.id} onClick={() => setCard(c)}
                className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-bg-muted text-left active:scale-[0.97] transition-transform">
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-sm font-bold text-text-primary leading-tight">{c.title}</span>
                <span className="text-[11px] text-text-tertiary">{c.category} · {c.readSec} сек</span>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* Weekly recap archive */}
      <BottomSheet open={sheet === 'recap'} onClose={close} title={recapIdx !== null ? 'Твоя финансовая неделя' : t('profile.recap')}>
        {recapIdx !== null ? (() => {
          const r = recaps[recapIdx];
          return (
            <div className="flex flex-col gap-4">
              <p className="text-center text-sm text-text-tertiary">{r.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-success-light rounded-xl p-3"><p className="text-xs text-text-tertiary">{t('profile.income')}</p><p className="font-bold text-success">{formatCurrency(r.income, true)}</p></div>
                <div className="bg-danger-light rounded-xl p-3"><p className="text-xs text-text-tertiary">{t('profile.expenses')}</p><p className="font-bold text-danger">{formatCurrency(r.expense, true)}</p></div>
              </div>
              {r.topCategory && (
                <div className="flex items-center gap-2 bg-bg-muted rounded-xl p-3">
                  <span className="text-xl">{r.topCategory.icon}</span>
                  <span className="text-sm text-text-secondary flex-1">Больше всего: <b className="text-text-primary">{r.topCategory.label}</b></span>
                  <span className="text-sm font-bold text-text-primary">{formatCurrency(r.topCategory.amount, true)}</span>
                </div>
              )}
              <div className="bg-primary-light rounded-xl p-3 text-center">
                <p className="text-sm font-semibold text-primary">{r.verdict}</p>
                {r.deltaPct !== 0 && <p className="text-xs text-text-secondary mt-1">Расходы {r.deltaPct > 0 ? '↑' : '↓'} {Math.abs(r.deltaPct)}% к прошлой неделе</p>}
              </div>
              <Button variant="outline" fullWidth onClick={() => setRecapIdx(null)}>← К архиву</Button>
            </div>
          );
        })() : (
          <div className="flex flex-col gap-2 max-h-[62vh] overflow-y-auto">
            {recaps.map((r, i) => (
              <button key={r.weekEnd} onClick={() => setRecapIdx(i)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-muted text-left active:scale-[0.98] transition-transform">
                <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-text-primary flex-shrink-0"><CalendarDays size={18} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-primary">{r.label}{i === 0 && <span className="ml-1.5 text-[10px] text-primary font-bold">последняя</span>}</p>
                  <p className="text-xs text-text-tertiary">{r.verdict}</p>
                </div>
                <span className={`text-sm font-bold ${r.net >= 0 ? 'text-success' : 'text-danger'}`}>{r.net >= 0 ? '+' : ''}{formatCurrency(r.net, true)}</span>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* Security */}
      <BottomSheet open={sheet === 'security'} onClose={close} title={t('profile.security')}>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-muted">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary"><Lock size={18} /></span>
            <span className="flex-1 text-sm font-medium text-text-primary">Код-пароль на вход</span>
            <Toggle on={user.pinEnabled ?? false} onToggle={() => updateUser({ pinEnabled: !(user.pinEnabled ?? false) })} />
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-muted">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary"><Fingerprint size={18} /></span>
            <span className="flex-1 text-sm font-medium text-text-primary">Вход по биометрии</span>
            <Toggle on={user.biometricEnabled ?? false} onToggle={() => updateUser({ biometricEnabled: !(user.biometricEnabled ?? false) })} />
          </div>
          <p className="text-xs text-text-tertiary text-center">Данные хранятся локально и не передаются третьим лицам.</p>
        </div>
      </BottomSheet>

      {/* Tutorial replay */}
      <BottomSheet open={sheet === 'tutorial'} onClose={close} title={t('profile.tutorial')}>
        <div className="flex flex-col gap-3">
          {[
            { e: '🏠', t: 'Главная', d: 'Баланс, инсайты и быстрый обзор финансов.' },
            { e: '💰', t: 'Финансы', d: 'Доходы, расходы по периодам, история и голосовой ввод.' },
            { e: '🤖', t: 'AI-помощник', d: 'Задавайте вопросы — отвечает с учётом ваших данных.' },
            { e: '🎯', t: 'Цели', d: 'Создавайте цели — посчитаем план под ваш бюджет.' },
          ].map(s => (
            <div key={s.t} className="flex items-center gap-3 p-3 rounded-xl bg-bg-muted">
              <span className="text-2xl">{s.e}</span>
              <div><p className="font-semibold text-sm text-text-primary">{s.t}</p><p className="text-xs text-text-secondary">{s.d}</p></div>
            </div>
          ))}
          <Button fullWidth onClick={close}>{t('common.done')}</Button>
        </div>
      </BottomSheet>
    </motion.div>
  );
};
