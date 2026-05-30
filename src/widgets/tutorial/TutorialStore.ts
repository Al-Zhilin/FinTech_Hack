import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KopiKotOutfit } from './KopiKot';

export interface TutorialStep {
  id: string;
  route: string;
  title: string;
  body: string;
  emoji: string;
  outfit: KopiKotOutfit;
  target?: string;           // data-tutorial-target значение
  position?: 'top' | 'bottom' | 'center';
  action?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    route: '/dashboard',
    emoji: '👋',
    outfit: 'party',
    title: 'Добро пожаловать в Эквватор!',
    body: 'Здесь твой финансовый центр — баланс, расходы, цели и AI-советы в одном месте. Проведём короткий тур за 60 секунд.',
    position: 'center',
    action: 'Начать тур →',
  },
  {
    id: 'dashboard-hero',
    route: '/dashboard',
    emoji: '💳',
    outfit: 'hero',
    target: 'dashboard-hero',
    title: 'Твой финансовый пульс',
    body: 'Здесь актуальный баланс и сколько можно безопасно потратить до конца месяца. Обновляется при каждой транзакции.',
    position: 'bottom',
    action: 'Дальше →',
  },
  {
    id: 'dashboard-categories',
    route: '/dashboard',
    emoji: '📊',
    outfit: 'advisor',
    target: 'dashboard-categories',
    title: 'Расходы по категориям',
    body: 'Каждую категорию можно нажать и спросить AI — он подскажет где именно можно сэкономить и сколько это даст в месяц.',
    position: 'bottom',
    action: 'Дальше →',
  },
  {
    id: 'coach-tip',
    route: '/dashboard',
    emoji: '🧭',
    outfit: 'ninja',
    target: 'coach-fab',
    title: 'Личный наставник КопиКот',
    body: 'Кнопка КопиКота в правом нижнем углу — это персональный план на неделю. Нажми — он покажет что делать прямо сейчас.',
    position: 'top',
    action: 'Дальше →',
  },
  {
    id: 'finance-intro',
    route: '/finance',
    emoji: '💰',
    outfit: 'chef',
    target: 'finance-balance',
    title: 'Раздел «Финансы»',
    body: 'Полная история операций, графики по периодам и разбивка по категориям. Переключай периоды кнопками сверху.',
    position: 'bottom',
    action: 'Дальше →',
  },
  {
    id: 'finance-fab',
    route: '/finance',
    emoji: '➕',
    outfit: 'chef',
    target: 'add-tx-fab',
    title: 'Добавляй траты за 5 секунд',
    body: 'Нажми «+» → выбери сумму и категорию. Или скажи голосом: «такси 650» или «зарплата 80000» — AI сам определит категорию.',
    position: 'top',
    action: 'Дальше →',
  },
  {
    id: 'chat-intro',
    route: '/chat',
    emoji: '🤖',
    outfit: 'astronaut',
    target: 'chat-header',
    title: 'AI-помощник знает твои финансы',
    body: 'Задай любой вопрос — «Почему у меня нет денег?», «Как накопить на отпуск за 3 месяца?» AI отвечает с учётом именно твоих доходов и расходов.',
    position: 'bottom',
    action: 'Дальше →',
  },
  {
    id: 'chat-input',
    route: '/chat',
    emoji: '📋',
    outfit: 'grad',
    target: 'chat-input',
    title: 'Таблицы и расчёты в чате',
    body: 'Когда AI строит план или сравнение — он показывает таблицу прямо в чате. Попробуй: «Сравни ипотеку на 15 и 20 лет».',
    position: 'top',
    action: 'Дальше →',
  },
  {
    id: 'arena-intro',
    route: '/arena',
    emoji: '🐾',
    outfit: 'hero',
    target: 'arena-cat',
    title: 'Арена — место для отдыха',
    body: 'Финансовые квизы, виртуальные монеты и КопиКот — твой питомец. Сюда приходят не от тревоги, а из интереса!',
    position: 'bottom',
    action: 'Дальше →',
  },
  {
    id: 'arena-streak',
    route: '/arena',
    emoji: '🔥',
    outfit: 'ninja',
    target: 'arena-streak',
    title: 'Трекер серии',
    body: 'Заходи каждый день — КопиКот следит за твоей серией. Чем дольше серия, тем счастливее кот и больше бонусов!',
    position: 'top',
    action: 'Дальше →',
  },
  {
    id: 'final',
    route: '/dashboard',
    emoji: '🚀',
    outfit: 'party',
    title: 'Готово! Ты знаешь главное',
    body: 'Подключи банк — и данные заполнятся автоматически. Или добавь первую операцию вручную. Наставник покажет что делать дальше.',
    position: 'center',
    action: 'Начать пользоваться!',
  },
];

interface TutorialState {
  done: boolean;
  active: boolean;
  stepIdx: number;
  start: () => void;
  next: () => void;
  skip: () => void;
  reset: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      done: false,
      active: false,
      stepIdx: 0,
      start:  () => set({ active: true, stepIdx: 0, done: false }),
      next:   () => {
        const { stepIdx } = get();
        const next = stepIdx + 1;
        if (next >= TUTORIAL_STEPS.length) set({ active: false, done: true, stepIdx: 0 });
        else set({ stepIdx: next });
      },
      skip:  () => set({ active: false, done: true, stepIdx: 0 }),
      reset: () => set({ done: false, active: false, stepIdx: 0 }),
    }),
    { name: 'ekvator-tutorial' },
  ),
);
