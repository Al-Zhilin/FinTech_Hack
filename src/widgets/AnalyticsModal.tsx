import { useState, useEffect, useRef } from 'react';
import {
  AnimatePresence,
  motion,
  type PanInfo,
} from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { formatCurrency } from '@/shared/lib/formatters';
import type { FinancialProfile } from '@/shared/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ekvator_analytics_shown_at';
const SHOW_DELAY_MS = 10_000;
const RETURNING_AGE_MS = 90_000;    // >1.5 мин с момента регистрации = вернувшийся
const COOLDOWN_MS = 24 * 3_600_000; // показываем раз в 24 часа

const SWIPE_THRESHOLD = 90;
const VELOCITY_THRESHOLD = 400;

const BG = '#F19B8C';

// ─── Slide data ──────────────────────────────────────────────────────────────

interface Slide {
  emoji: string;
  tag: string;
  title: string;
  resultLabel: string;
  resultValue: string;
  resultSub?: string;
  recommendation: string;
}

// Кураторские пулы — ротация по дню месяца, чтобы контент всегда существовал и обновлялся
const NEWS_POOL: Omit<Slide, 'emoji' | 'tag'>[] = [
  {
    title: 'Вклады на пике доходности',
    resultLabel: 'Ставки по вкладам',
    resultValue: 'до 18%',
    resultSub: 'Ключевая ставка ЦБ держится высокой',
    recommendation:
      'Сейчас выгодное время копить: открой накопительный счёт или короткий вклад — деньги будут работать сами, без риска.',
  },
  {
    title: 'Инфляция съедает наличные',
    resultLabel: 'Годовая инфляция',
    resultValue: '~8%',
    resultSub: 'Деньги «под подушкой» теряют ценность',
    recommendation:
      'Держать всю сумму наличными невыгодно. Размести подушку безопасности на накопительном счёте с процентом на остаток.',
  },
  {
    title: 'Верни до 52 000 ₽ за год',
    resultLabel: 'Налоговый вычет по ИИС',
    resultValue: '13%',
    resultSub: 'Государство возвращает налог с инвестиций',
    recommendation:
      'Если платишь НДФЛ — открой ИИС. Внося до 400 000 ₽ в год, можно вернуть до 52 000 ₽ налогового вычета.',
  },
  {
    title: 'Кэшбэк стал выгоднее',
    resultLabel: 'Средний кэшбэк по картам',
    resultValue: 'до 5%',
    resultSub: 'Банки усилили программы лояльности',
    recommendation:
      'Подбери карту с повышенным кэшбэком в твоих топ-категориях трат — это пассивный возврат нескольких тысяч в месяц.',
  },
];

const SAVING_POOL: Omit<Slide, 'emoji' | 'tag' | 'resultValue' | 'resultSub'>[] = [
  {
    title: 'Правило 50 / 30 / 20',
    resultLabel: 'Откладывай минимум',
    recommendation:
      '50% дохода — на нужды, 30% — на желания, 20% — в накопления. Раздели счета сразу после зарплаты, чтобы не было соблазна потратить.',
  },
  {
    title: 'Сначала заплати себе',
    resultLabel: 'Автоперевод в день зарплаты',
    recommendation:
      'Настрой автоматический перевод части дохода на отдельный счёт в день зарплаты. Копить «что останется» почти никогда не работает.',
  },
  {
    title: 'Округляй каждую покупку',
    resultLabel: 'Копилка из мелочи',
    recommendation:
      'Подключи округление трат: с каждой покупки остаток до 100 ₽ уходит в копилку. За год незаметно набегает крупная сумма.',
  },
];

const LIFEHACK_POOL: Omit<Slide, 'emoji' | 'tag'>[] = [
  {
    title: 'Правило 24 часов',
    resultLabel: 'Против импульсивных трат',
    resultValue: '−40%',
    resultSub: 'спонтанных покупок',
    recommendation:
      'Захотел купить что-то незапланированное — подожди сутки. В большинстве случаев желание проходит, а деньги остаются.',
  },
  {
    title: 'Список перед магазином',
    resultLabel: 'Экономия на продуктах',
    resultValue: 'до 20%',
    resultSub: 'чека за поход в магазин',
    recommendation:
      'Ходи в магазин со списком и не на голодный желудок. Покупки строго по списку срезают чек на пятую часть.',
  },
  {
    title: 'Ревизия подписок',
    resultLabel: 'Скрытые ежемесячные траты',
    resultValue: '~2 000 ₽',
    resultSub: 'в месяц на ненужных подписках',
    recommendation:
      'Раз в месяц проверяй список активных подписок. Отмени те, которыми не пользовался последние 30 дней — это чистая экономия.',
  },
];

const buildSlides = (p: FinancialProfile): Slide[] => {
  const saved = p.monthlyIncome - p.monthlySpent;
  const health = 100 - p.stressScore;
  const healthLabel =
    health >= 65 ? 'Отличное' : health >= 40 ? 'Стабильное' : 'Требует внимания';

  // Ближайшая по сроку цель (с запасным вариантом, если целей нет)
  const closestGoal = [...p.goals].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  )[0];
  const goalPct = closestGoal
    ? Math.round((closestGoal.current / closestGoal.target) * 100)
    : 0;
  const goalLeft = closestGoal ? closestGoal.target - closestGoal.current : 0;

  // Детерминированная ротация по дню месяца
  const day = new Date().getDate();
  const news = NEWS_POOL[day % NEWS_POOL.length];
  const saving = SAVING_POOL[day % SAVING_POOL.length];
  const lifehack = LIFEHACK_POOL[day % LIFEHACK_POOL.length];
  const savingTarget = Math.round((p.monthlyIncome * 0.2) / 100) * 100;

  return [
    // 1 — Анализ профиля
    {
      emoji: '📊',
      tag: 'Анализ профиля',
      title: 'Твой финансовый портрет',
      resultLabel: 'Индекс здоровья финансов',
      resultValue: `${health}/100`,
      resultSub: `${healthLabel} · баланс ${formatCurrency(p.balance, true)} · копишь ${p.savingsRate}%`,
      recommendation:
        health >= 65
          ? 'Финансы в балансе — так держать! Подумай о подушке на 6 месяцев расходов, если её ещё нет.'
          : `Откладываешь ${formatCurrency(saved, true)} в месяц. Сократи 1–2 крупные категории трат — и индекс заметно вырастет.`,
    },
    // 2 — Из целей
    {
      emoji: '🎯',
      tag: 'Твоя цель',
      title: closestGoal ? `Цель «${closestGoal.title}»` : 'Поставь первую цель',
      resultLabel: closestGoal ? 'Прогресс накоплений' : 'Активных целей пока нет',
      resultValue: closestGoal ? `${goalPct}%` : 'Старт',
      resultSub: closestGoal
        ? `${formatCurrency(closestGoal.current, true)} из ${formatCurrency(closestGoal.target, true)} · осталось ${formatCurrency(goalLeft, true)}`
        : 'С целью копить проще и мотивации больше',
      recommendation: closestGoal
        ? goalPct >= 70
          ? 'Финишная прямая! Добавь небольшой бонус в этом месяце — и закроешь цель раньше срока.'
          : `Чтобы успеть к сроку, увеличь ежемесячный взнос. Даже +2 000 ₽ заметно ускорят прогресс.`
        : 'Сформулируй конкретную цель с суммой и датой — например, «подушка 150 000 ₽ к Новому году».',
    },
    // 3 — Из новостей
    { emoji: '📰', tag: 'Новости', ...news },
    // 4 — Совет по накоплению
    {
      emoji: '💰',
      tag: 'Совет по накоплению',
      ...saving,
      resultValue: '20%',
      resultSub: `от дохода — это ≈ ${formatCurrency(savingTarget, true)} в месяц`,
    },
    // 5 — Лайфхак
    { emoji: '💡', tag: 'Лайфхак', ...lifehack },
  ];
};

// ─── Slide view ────────────────────────────────────────────────────────────────

const SlideView = ({ slide, index, total }: { slide: Slide; index: number; total: number }) => (
  <div className="h-full w-full flex flex-col items-center px-7 pt-24 pb-28 text-white">
    {/* Картинка */}
    <motion.div
      initial={{ scale: 0.6, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
      className="relative flex items-center justify-center mb-8"
    >
      <div className="absolute w-44 h-44 rounded-full bg-white/15 blur-xl" />
      <div className="absolute w-40 h-40 rounded-full bg-white/10" />
      <div className="relative w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
        <span className="text-6xl drop-shadow-lg">{slide.emoji}</span>
      </div>
    </motion.div>

    {/* Заголовок */}
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-2"
    >
      {slide.tag} · {index + 1}/{total}
    </motion.p>
    <motion.h2
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-[26px] font-bold text-center leading-tight mb-7"
    >
      {slide.title}
    </motion.h2>

    {/* Результат */}
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      className="w-full bg-white/15 backdrop-blur-md rounded-3xl px-5 py-5 mb-4 text-center"
    >
      <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
        {slide.resultLabel}
      </p>
      <p className="text-4xl font-bold leading-none mb-1.5">{slide.resultValue}</p>
      {slide.resultSub && (
        <p className="text-white/80 text-sm leading-snug">{slide.resultSub}</p>
      )}
    </motion.div>

    {/* Рекомендация */}
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.36 }}
      className="w-full bg-white rounded-3xl px-5 py-4 mt-auto"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">💡</span>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BG }}>
          Рекомендация
        </p>
      </div>
      <p className="text-text-primary text-sm leading-relaxed">{slide.recommendation}</p>
    </motion.div>
  </div>
);

// ─── Main modal ────────────────────────────────────────────────────────────────

export const AnalyticsModal = () => {
  const user = useUserStore(s => s.user);
  const profile = useFinanceStore(s => s.profile);

  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const slides = buildSlides(profile);
  const total = slides.length;

  useEffect(() => {
    if (!user) return;

    const age = Date.now() - new Date(user.createdAt).getTime();
    if (age < RETURNING_AGE_MS) return; // новый пользователь

    const lastShown = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (Date.now() - lastShown < COOLDOWN_MS) return; // уже показывали сегодня

    timerRef.current = setTimeout(() => {
      setVisible(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }, SHOW_DELAY_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [user]);

  const close = () => {
    setVisible(false);
    setIndex(0);
  };

  const next = () => {
    if (index < total - 1) setIndex(i => i + 1);
    else close();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    // Свайп вниз → следующий слайд (TikTok-style)
    if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
      next();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 overflow-hidden"
          style={{ backgroundColor: BG, maxWidth: 430, margin: '0 auto' }}
        >
          {/* Декоративные блики */}
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-black/5 blur-3xl pointer-events-none" />

          {/* ── Top bar ── */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-5 pt-12">
            {/* Сегментированный прогресс (stories-style) */}
            <div className="flex-1 flex gap-1.5">
              {slides.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={false}
                    animate={{ width: i <= index ? '100%' : '0%' }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={close}
              className="w-8 h-8 -mt-0.5 rounded-full bg-white/20 flex items-center justify-center text-white text-xl leading-none backdrop-blur-sm active:scale-90 transition-transform"
            >
              ×
            </button>
          </div>

          {/* ── Slides (vertical TikTok paging) ── */}
          <motion.div
            className="absolute inset-0 z-10 touch-none cursor-grab active:cursor-grabbing"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.5}
            onDragEnd={handleDragEnd}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={index}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="absolute inset-0"
              >
                <SlideView slide={slides[index]} index={index} total={total} />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* ── Hint ── */}
          <motion.div
            className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center gap-1 pb-7 pointer-events-none"
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          >
            <span className="text-white/70 text-2xl leading-none">⌄</span>
            <span className="text-white/70 text-xs font-medium">
              {index < total - 1 ? 'Листай вниз' : 'Свайп вниз — закрыть'}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
