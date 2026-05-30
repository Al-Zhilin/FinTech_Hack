import type { Transaction } from '@/shared/types';
import { summarize, byCategory } from '@/entities/finance/model/financeSelectors';
import { formatCurrency } from '@/shared/lib/formatters';

export interface WeeklyRecap {
  weekEnd: string;       // дата воскресенья (ISO)
  label: string;        // «12–18 мая»
  income: number;
  expense: number;
  net: number;
  topCategory?: { label: string; icon: string; amount: number };
  deltaPct: number;     // изменение расходов к прошлой неделе, %
  verdict: string;
}

const fmtRange = (from: Date, to: Date) =>
  `${from.toLocaleDateString('ru-RU', { day: 'numeric' })}–${to.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;

/** Строит архив воскресных отчётов «Твоя финансовая неделя» за последние N недель. */
export const buildWeeklyRecaps = (txs: Transaction[], weeks = 6): WeeklyRecap[] => {
  const today = new Date();
  const lastSunday = new Date(today);
  const dow = today.getDay(); // 0=Вс
  lastSunday.setDate(today.getDate() - (dow === 0 ? 0 : dow));
  lastSunday.setHours(23, 59, 59, 0);

  const recaps: WeeklyRecap[] = [];
  let prevExpense: number | null = null;

  for (let i = 0; i < weeks; i++) {
    const to = new Date(lastSunday);
    to.setDate(lastSunday.getDate() - i * 7);
    const from = new Date(to);
    from.setDate(to.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    const weekTx = txs.filter(t => {
      const d = +new Date(t.date);
      return d >= +from && d <= +to;
    });
    const sum = summarize(weekTx);
    const cats = byCategory(weekTx, 'expense');
    const top = cats[0];

    const deltaPct = prevExpense && prevExpense > 0
      ? Math.round(((sum.expense - prevExpense) / prevExpense) * 100)
      : 0;
    prevExpense = sum.expense;

    const verdict = sum.net >= 0
      ? `Отложено ${Math.round((sum.net / Math.max(1, sum.income)) * 100)}% дохода`
      : 'Расходы превысили доход';

    recaps.push({
      weekEnd: to.toISOString(),
      label: fmtRange(from, to),
      income: sum.income,
      expense: sum.expense,
      net: sum.net,
      topCategory: top ? { label: top.label, icon: top.icon, amount: top.amount } : undefined,
      deltaPct,
      verdict,
    });
  }

  return recaps;
};

// ─── Воскресный recap-сторис (5 блоков + хук) ────────────────────────────────────
// Правила: одна мысль на блок, 2–3 предложения, живой разговор, обращение на «ты».

export interface RecapBlock {
  emoji: string;
  tag: string;
  title: string;
  text: string;
  askPrompt?: string; // для CTA-блока — готовый вопрос к AI
}

export interface RecapStory {
  hook: string;        // 1 строка для push-уведомления
  blocks: RecapBlock[];
}

export const buildRecapStory = (recap: WeeklyRecap, name?: string): RecapStory => {
  const fc = (v: number) => formatCurrency(v, true);
  const first = name ? name.split(' ')[0] : null;
  const savedPositive = recap.net >= 0;
  const ratePct = recap.income > 0 ? Math.round((recap.net / recap.income) * 100) : 0;
  const top = recap.topCategory;
  const topPct = top && recap.expense > 0 ? Math.round((top.amount / recap.expense) * 100) : 0;

  const hook = savedPositive
    ? `Неделя в плюс: отложено ${fc(recap.net)} 👀 Загляни в отчёт`
    : `Расходы недели: ${fc(recap.expense)}. Глянем, где утекло? 👀`;

  const blocks: RecapBlock[] = [
    {
      emoji: savedPositive ? '🎉' : '🫶',
      tag: 'Твоя финансовая неделя',
      title: first ? `${first}, неделя закрыта` : 'Неделя закрыта',
      text: savedPositive
        ? `Ты потратил ${fc(recap.expense)} и отложил ${fc(recap.net)}. Хорошая неделя — давай по деталям.`
        : `Расходы (${fc(recap.expense)}) на этой неделе обогнали доход. Без паники, сейчас разберёмся вместе.`,
    },
    {
      emoji: top?.icon ?? '📊',
      tag: 'Куда ушли деньги',
      title: top ? `Лидер недели — ${top.label}` : 'Траты под контролем',
      text: top
        ? `На «${top.label}» ушло ${fc(top.amount)} — это ${topPct}% всех трат недели. Знал за собой такое?`
        : 'Крупных трат на этой неделе почти не было. Так и держим — расходы ровные.',
    },
    {
      emoji: recap.deltaPct > 0 ? '📈' : recap.deltaPct < 0 ? '📉' : '➡️',
      tag: 'Сравнение с прошлой неделей',
      title: recap.deltaPct > 0 ? 'Тратишь больше' : recap.deltaPct < 0 ? 'Тратишь меньше' : 'Стабильно',
      text: recap.deltaPct > 0
        ? `Расходы выросли на ${recap.deltaPct}% к прошлой неделе. Иногда это разовые покупки — но стоит присмотреться.`
        : recap.deltaPct < 0
          ? `Ты сократил траты на ${Math.abs(recap.deltaPct)}% к прошлой неделе. Это реальный прогресс 👏`
          : 'Расходы держатся на уровне прошлой недели — предсказуемость это хорошо.',
    },
    {
      emoji: '💪',
      tag: 'Победа недели',
      title: savedPositive ? 'Ты копишь' : 'Есть на чём отыграться',
      text: savedPositive
        ? `${ratePct}% дохода ушло в накопления, а не на ветер. Маленькие победы складываются в большие.`
        : 'Крупных импульсивных трат немного — значит, вернуть баланс реально уже на следующей неделе.',
    },
    {
      emoji: '🎯',
      tag: 'Фокус на следующую неделю',
      title: 'Один шаг вперёд',
      text: top
        ? `Попробуй удержать «${top.label}» в рамках — это твой главный рычаг. Хочешь, посчитаю лимит на твоих цифрах?`
        : 'Поставь себе одну небольшую цель по накоплениям на неделю — и я помогу её достичь.',
      askPrompt: top
        ? `Моя главная статья расходов за неделю — «${top.label}» (${top.amount} ₽, ${topPct}% трат). Помоги установить разумный недельный лимит и план, как в него вписаться.`
        : 'Составь мне простой план накоплений на следующую неделю с учётом моих доходов и расходов.',
    },
  ];

  return { hook, blocks };
};
