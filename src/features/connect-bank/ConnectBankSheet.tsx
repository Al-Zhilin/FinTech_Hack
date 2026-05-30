import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Landmark, Loader2, ChevronRight, TrendingUp, ShoppingBag } from 'lucide-react';
import { BANKS } from '@/entities/bank/model/banksMock';
import { MOCK_FINANCE } from '@/entities/finance/model/mockData';
import { generateTransactions, generateSaverTransactions } from '@/entities/finance/model/transactions';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { useUserGoalsStore } from '@/entities/goal/model/userGoalsStore';
import { useUserStore } from '@/entities/user/model/userStore';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

const CONNECTABLE_BANKS = BANKS.filter(b =>
  ['sber', 'tbank', 'alfa', 'vtb'].includes(b.id),
);

// ── Профили данных ────────────────────────────────────────────────────────────
type DataProfile = 'spender' | 'saver';

interface ProfileOption {
  id: DataProfile;
  emoji: string;
  title: string;
  subtitle: string;
  income: string;
  savings: string;
  accent: string;
  badgeColor: string;
  icon: typeof TrendingUp;
  highlights: string[];
}

const DATA_PROFILES: ProfileOption[] = [
  {
    id: 'spender',
    emoji: '🛍️',
    title: 'Активный спендер',
    subtitle: 'Кофе, такси, доставки, развлечения',
    income: '120 000 ₽/мес',
    savings: '~12%',
    accent: 'from-primary-light to-warning-light',
    badgeColor: 'bg-primary text-white',
    icon: ShoppingBag,
    highlights: [
      'Частые траты на еду и кофейни',
      'Такси и каршеринг каждый день',
      'Регулярные импульсные покупки',
      'Подписки на всё подряд',
    ],
  },
  {
    id: 'saver',
    emoji: '📈',
    title: 'Накопитель',
    subtitle: 'Высокий доход, умеренные траты, фриланс',
    income: '200 000 ₽/мес',
    savings: '~40%',
    accent: 'from-success-light to-purple/10',
    badgeColor: 'bg-success text-white',
    icon: TrendingUp,
    highlights: [
      'IT-специалист с высоким доходом',
      'Фриланс и дивиденды как доп. доход',
      'Осознанные, умеренные расходы',
      'Активное накопление и инвестиции',
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected?: (count: number) => void;
}

export const ConnectBankSheet = ({ open, onClose, onConnected }: Props) => {
  const bankConnected    = useUserTxStore(s => s.bankConnected);
  const connectedBankName = useUserTxStore(s => s.connectedBankName);
  const updateUser       = useUserStore(s => s.updateUser);
  const user             = useUserStore(s => s.user);
  const { goals, addGoal } = useUserGoalsStore();

  const [phase,         setPhase]         = useState<'profile' | 'pick' | 'loading' | 'done'>('profile');
  const [pickedProfile, setPickedProfile] = useState<DataProfile>('spender');
  const [pickedName,    setPickedName]    = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [showDetails,   setShowDetails]   = useState<DataProfile | null>(null);

  const reset = () => {
    setPhase('profile');
    setPickedName('');
    setImportedCount(0);
    setShowDetails(null);
  };

  const close = () => { reset(); onClose(); };

  const handleProfilePick = (profileId: DataProfile) => {
    setPickedProfile(profileId);
    setPhase('pick');
  };

  const handleBankPick = async (bankId: string, bankName: string) => {
    setPickedName(bankName);
    setPhase('loading');

    await new Promise(r => setTimeout(r, 1600));

    // Генерируем данные нужного профиля
    const txs      = pickedProfile === 'saver' ? generateSaverTransactions(90) : generateTransactions(90);
    const income   = pickedProfile === 'saver' ? 200_000 : 120_000;
    const expenses = pickedProfile === 'saver' ? 75_000 : 85_000;

    // Записываем транзакции
    useUserTxStore.setState({ txs, bankConnected: true, connectedBankId: bankId, connectedBankName: bankName });

    // Обновляем профиль пользователя под выбранный датасет
    if (user) {
      updateUser({
        income:          user.income > 0 ? user.income : income,
        monthlyExpenses: user.monthlyExpenses > 0 ? user.monthlyExpenses : expenses,
      });
    }

    // Добавляем цели если их нет
    if (goals.length === 0) {
      const goalsData = pickedProfile === 'saver'
        ? [
            { title: 'Первый миллион', target: 1_000_000, current: 320_000, deadline: '2026-12-31', color: '#B87EFF', icon: '💎' },
            { title: 'Квартира (первый взнос)', target: 1_500_000, current: 450_000, deadline: '2027-06-01', color: '#E8856A', icon: '🏠' },
            { title: 'Инвест-портфель', target: 500_000, current: 180_000, deadline: '2026-09-01', color: '#34C759', icon: '📈' },
          ]
        : MOCK_FINANCE.goals;
      for (const g of goalsData) addGoal(g);
    }

    const count = txs.length;
    setImportedCount(count);
    setPhase('done');
    onConnected?.(count);
  };

  const selectedProfile = DATA_PROFILES.find(p => p.id === pickedProfile)!;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={
        phase === 'done'    ? 'Банк подключён' :
        phase === 'pick'    ? `Выберите банк · ${selectedProfile.emoji} ${selectedProfile.title}` :
        phase === 'loading' ? 'Подключение…' :
                              'Подключить банк'
      }
    >
      {/* ── Шаг 1: Выбор профиля данных ── */}
      {phase === 'profile' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary leading-snug">
            Выберите тип финансового профиля — это определит, какие данные загрузятся в приложение для демонстрации.
          </p>

          {DATA_PROFILES.map(profile => {
            const Icon = profile.icon;
            const isExpanded = showDetails === profile.id;
            return (
              <motion.div key={profile.id} layout className="overflow-hidden">
                <div className={`rounded-2xl bg-gradient-to-br ${profile.accent} border border-border-light overflow-hidden`}>
                  {/* Основная карточка */}
                  <button
                    onClick={() => handleProfilePick(profile.id)}
                    className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
                  >
                    <span className="text-3xl flex-shrink-0">{profile.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-extrabold text-text-primary">{profile.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profile.badgeColor}`}>
                          {profile.savings} сбережений
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">{profile.subtitle}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">Доход ≈ {profile.income}</p>
                    </div>
                    <ChevronRight size={18} className="text-primary flex-shrink-0" />
                  </button>

                  {/* Кнопка «подробнее» */}
                  <button
                    onClick={() => setShowDetails(isExpanded ? null : profile.id)}
                    className="w-full px-4 pb-2 text-[11px] font-semibold text-primary text-left"
                  >
                    {isExpanded ? '▲ Скрыть детали' : '▼ Что входит в профиль?'}
                  </button>

                  {/* Детали профиля */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 flex flex-col gap-1.5">
                          {profile.highlights.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                              <Icon size={13} className="text-primary flex-shrink-0" />
                              {h}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}

          {bankConnected && connectedBankName && (
            <p className="text-xs text-text-tertiary text-center mt-1">
              Сейчас подключён: {connectedBankName}. Новый выбор обновит все данные.
            </p>
          )}
        </div>
      )}

      {/* ── Шаг 2: Выбор банка ── */}
      {phase === 'pick' && (
        <div className="flex flex-col gap-3">
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r ${selectedProfile.accent} mb-1`}>
            <span className="text-2xl">{selectedProfile.emoji}</span>
            <div>
              <p className="font-bold text-sm text-text-primary">{selectedProfile.title}</p>
              <p className="text-xs text-text-tertiary">{selectedProfile.subtitle} · {selectedProfile.income}</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary">Выберите банк — загрузим 90 дней операций:</p>

          {CONNECTABLE_BANKS.map(bank => (
            <button
              key={bank.id}
              onClick={() => handleBankPick(bank.id, bank.name)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-bg-muted hover:bg-border-light active:scale-[0.99] transition-all"
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: bank.color }}
              >
                {bank.short}
              </span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-text-primary">{bank.name}</p>
                <p className="text-xs text-text-tertiary">Синхронизация операций · 90 дней</p>
              </div>
              <Landmark size={18} className="text-text-tertiary" />
            </button>
          ))}

          <button onClick={() => setPhase('profile')} className="text-sm text-text-tertiary text-center pt-1">
            ← Сменить профиль
          </button>
        </div>
      )}

      {/* ── Шаг 3: Загрузка ── */}
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <Loader2 size={44} className="text-primary animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-xl">{selectedProfile.emoji}</span>
          </div>
          <div className="text-center">
            <p className="font-bold text-text-primary">Подключаем {pickedName}…</p>
            <p className="text-sm text-text-tertiary mt-1">Загружаем операции профиля «{selectedProfile.title}»</p>
          </div>
          <div className="w-full max-w-xs">
            <motion.div className="h-1.5 bg-primary-light rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Шаг 4: Готово ── */}
      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <span className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center">
            <Check size={32} className="text-success" />
          </span>
          <div className="text-center">
            <p className="font-extrabold text-lg text-text-primary">{pickedName} подключён</p>
            <p className="text-sm text-text-secondary mt-1">
              Профиль <b>«{selectedProfile.title}»</b> · {importedCount} операций
            </p>
          </div>

          <div className={`w-full rounded-2xl p-4 bg-gradient-to-br ${selectedProfile.accent}`}>
            <div className="flex flex-col gap-2">
              {selectedProfile.highlights.slice(0, 3).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-text-primary">
                  <Check size={12} className="text-success flex-shrink-0" /> {h}
                </div>
              ))}
            </div>
          </div>

          <Button size="lg" fullWidth onClick={close}>Смотреть финансы</Button>
        </motion.div>
      )}
    </BottomSheet>
  );
};
