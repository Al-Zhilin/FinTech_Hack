// КопиКот — данные персонажа Арены: состояния, фразы, экономика, магазин, вопросы.

export type CatStateKey = 'rich' | 'normal' | 'hungry' | 'sad' | 'sleeping';

export interface CatStateMeta {
  key: CatStateKey;
  label: string;
  aura: string;
  caption: string;
}

// Состояние зависит от баланса монет и того, как давно заходил пользователь.
export const CAT_STATES: Record<CatStateKey, CatStateMeta> = {
  rich:     { key: 'rich',     label: 'Богатый',    aura: '#FFD54A', caption: 'На горе золота' },
  normal:   { key: 'normal',   label: 'Любопытный', aura: '#A29BFE', caption: 'Наблюдает за тобой' },
  hungry:   { key: 'hungry',   label: 'Голодный',   aura: '#FF8A65', caption: 'Пора экономить' },
  sad:      { key: 'sad',      label: 'Грустный',   aura: '#90A4AE', caption: 'Скучал по тебе' },
  sleeping: { key: 'sleeping', label: 'Спящий',     aura: '#7986CB', caption: 'Заснул без тебя' },
};

export const RICH_THRESHOLD = 500;
export const HUNGRY_THRESHOLD = 100;
const SAD_AFTER_DAYS = 2;
const SLEEP_AFTER_DAYS = 5;

export function getCatState(coins: number, daysAway = 0): CatStateMeta {
  if (daysAway >= SLEEP_AFTER_DAYS) return CAT_STATES.sleeping;
  if (daysAway >= SAD_AFTER_DAYS) return CAT_STATES.sad;
  if (coins >= RICH_THRESHOLD) return CAT_STATES.rich;
  if (coins < HUNGRY_THRESHOLD) return CAT_STATES.hungry;
  return CAT_STATES.normal;
}

// ─── Фразы кота (тап → случайная фраза). Три типа. ──────────────────────────
export type PhraseType = 'wisdom' | 'reminder' | 'meow';
export interface CatPhrase { type: PhraseType; text: string }

export const CAT_PHRASES: Record<PhraseType, string[]> = {
  wisdom: [
    'Сложный процент — восьмое чудо света. Кто понимает — зарабатывает.',
    'Сначала заплати себе: отложи 10% до того, как потратишь остальное.',
    'Подушка безопасности — это 3–6 твоих месячных расходов. У меня — корм на год.',
    'Не храни все яйца в одной корзине. И все рыбки — в одной миске.',
    'Кредитка — инструмент, а не доход. Я проверял когтями, так и есть.',
  ],
  reminder: [
    'Ежедневный квиз не пройден. Я наблюдаю. Внимательно.',
    'Монеты сами себя не заработают. Сыграй дуэль!',
    'Загляни в Витрину — там новая корона. Мне идёт, я мерил.',
    'Ты не открывал обучающие карточки. А ведь там монеты лежат.',
    'Соперник уже разминается. Не дай ему забрать твой рейтинг.',
  ],
  meow: [
    'Мяу. Это было глубоко, согласись.',
    'Погладь меня и иди копить дальше.',
    'Я не толстый, я инвестировал в шерсть.',
    'Знаешь, почему я в плаще? Финансы — это супергеройство.',
    'Тшш. Считаю твои монеты. Их... достаточно. Пока.',
  ],
};

const PHRASE_POOL: CatPhrase[] = (Object.keys(CAT_PHRASES) as PhraseType[]).flatMap((type) =>
  CAT_PHRASES[type].map((text) => ({ type, text })),
);

export function getRandomPhrase(): CatPhrase {
  return PHRASE_POOL[Math.floor(Math.random() * PHRASE_POOL.length)];
}

// ─── Экономика монет ────────────────────────────────────────────────────────
export const REWARDS = {
  dailyLogin: 20,
  starterPack: 50,
  soloPerCorrect: 12,
  dailyQuestion: 25,
  duelWin: 80,
  duelLose: 15,
} as const;

export const DUEL_STAKE = 40;

// ─── Витрина наград (магазин) ───────────────────────────────────────────────
export type ShopTab = 'cat' | 'app' | 'partners';
export const SHOP_TABS: { key: ShopTab; label: string }[] = [
  { key: 'cat', label: 'КопиКот' },
  { key: 'app', label: 'Приложение' },
  { key: 'partners', label: 'Партнёры' },
];

export type AccessorySlot = 'head' | 'face' | 'neck' | 'paw' | 'feet';

export interface ShopItem {
  id: string;
  tab: ShopTab;
  name: string;
  price: number;
  emoji: string;
  desc: string;
  image: string;          // URL картинки (Unsplash CDN)
  imageBg?: string;       // цвет-заглушка пока грузится
  slot?: AccessorySlot;   // только для аксессуаров кота
  partner?: boolean;
  partnerBrand?: string;  // название партнёра
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Для КопиКота (60–200) — аксессуары, можно примерить ──
  {
    id: 'c_crown', tab: 'cat', name: 'Золотая корона', price: 200, emoji: '👑', slot: 'head',
    desc: 'Монарх виртуальной казны',
    image: 'https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?w=400&h=400&fit=crop&q=80',
    imageBg: '#FFF3CD',
  },
  {
    id: 'c_hat', tab: 'cat', name: 'Цилиндр', price: 140, emoji: '🎩', slot: 'head',
    desc: 'Джентльмен от мира финансов',
    image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=400&h=400&fit=crop&q=80',
    imageBg: '#1A1A2E',
  },
  {
    id: 'c_glasses', tab: 'cat', name: 'Солнечные очки', price: 120, emoji: '🕶️', slot: 'face',
    desc: 'Будущее ослепительно ярко',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop&q=80',
    imageBg: '#E3F2FD',
  },
  {
    id: 'c_bowtie', tab: 'cat', name: 'Галстук-бабочка', price: 80, emoji: '🎀', slot: 'neck',
    desc: 'Для важных финансовых переговоров',
    image: 'https://images.unsplash.com/photo-1589756882348-3b70f4cde7a2?w=400&h=400&fit=crop&q=80',
    imageBg: '#FCE4EC',
  },
  {
    id: 'c_skate', tab: 'cat', name: 'Скейтборд', price: 160, emoji: '🛹', slot: 'feet',
    desc: 'Катится к финансовой свободе',
    image: 'https://images.unsplash.com/photo-1547047562-90c5f3e16e1b?w=400&h=400&fit=crop&q=80',
    imageBg: '#F3E5F5',
  },
  {
    id: 'c_wand', tab: 'cat', name: 'Магический жезл', price: 60, emoji: '🪄', slot: 'paw',
    desc: 'Немного финансовой магии каждый день',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop&q=80',
    imageBg: '#EDE7F6',
  },

  // ── Для приложения (50–500) — визуальные апгрейды ──
  {
    id: 'a_gold', tab: 'app', name: 'Золотая тема', price: 500, emoji: '✨',
    desc: 'Премиальный золотой интерфейс для ценителей',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop&q=80',
    imageBg: '#FFF8E1',
  },
  {
    id: 'a_neon', tab: 'app', name: 'Неоновая тема', price: 400, emoji: '💜',
    desc: 'Тёмный неон — для ночных финансистов',
    image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop&q=80',
    imageBg: '#1A1A2E',
  },
  {
    id: 'a_frame', tab: 'app', name: 'Анимированная рамка', price: 250, emoji: '🖼️',
    desc: 'Эффектная рамка вокруг аватара профиля',
    image: 'https://images.unsplash.com/photo-1617817508016-7fb6cb73a7e7?w=400&h=400&fit=crop&q=80',
    imageBg: '#E8F5E9',
  },
  {
    id: 'a_icons', tab: 'app', name: 'Иконки категорий', price: 150, emoji: '🎨',
    desc: 'Кастомные иконки для всех категорий расходов',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80',
    imageBg: '#FFF3E0',
  },
  {
    id: 'a_emoji', tab: 'app', name: 'Пак стикеров', price: 50, emoji: '🐾',
    desc: 'Стикеры КопиКота для заметок и чатов',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop&q=80',
    imageBg: '#E1F5FE',
  },

  // ── От партнёров (3000–10000) ──
  {
    id: 'p_coffee', tab: 'partners', name: 'Кофе в подарок', price: 3000, emoji: '☕',
    desc: 'Промокод на любой напиток в сети кофеен',
    partnerBrand: 'Coffeemania',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop&q=80',
    imageBg: '#EFEBE9',
    partner: true,
  },
  {
    id: 'p_shop', tab: 'partners', name: 'Скидка 15%', price: 4000, emoji: '🛍️',
    desc: 'Промокод на следующую покупку в магазине',
    partnerBrand: 'Lamoda',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=400&fit=crop&q=80',
    imageBg: '#FCE4EC',
    partner: true,
  },
  {
    id: 'p_music', tab: 'partners', name: 'Музыка · 1 мес.', price: 5000, emoji: '🎧',
    desc: 'Подписка на музыкальный стриминг без рекламы',
    partnerBrand: 'Яндекс Музыка',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80',
    imageBg: '#E8EAF6',
    partner: true,
  },
  {
    id: 'p_premium', tab: 'partners', name: 'ФинПилот Premium', price: 10000, emoji: '🚀',
    desc: 'Месяц Premium — AI без ограничений, расширенная аналитика',
    partnerBrand: 'ФинПилот',
    image: 'https://images.unsplash.com/photo-1534796636912-3b6cec9c8ce3?w=400&h=400&fit=crop&q=80',
    imageBg: '#EDE7F6',
    partner: true,
  },
];

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

// ─── Вопросы Арены (дуэли и квизы) ──────────────────────────────────────────
export type QuestionType = 'term' | 'case' | 'spend';
export interface ArenaQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  personal?: boolean; // «угадай свои расходы» — личный вопрос
}

export const ARENA_QUESTIONS: ArenaQuestion[] = [
  {
    id: 'a1', type: 'term',
    question: 'Что такое диверсификация простыми словами?',
    options: ['Хранить деньги в одном банке', 'Распределить вложения между разными активами', 'Тратить всё сразу', 'Брать кредит на инвестиции'],
    correctAnswer: 1,
    explanation: 'Диверсификация снижает риск: падение одного актива компенсируют другие.',
  },
  {
    id: 'a2', type: 'term',
    question: 'Что значит «ликвидность» актива?',
    options: ['Как быстро его можно продать без потери цены', 'Сколько он весит', 'Его доходность за год', 'Размер комиссии брокера'],
    correctAnswer: 0,
    explanation: 'Ликвидность — скорость, с которой актив превращается в деньги по справедливой цене.',
  },
  {
    id: 'a3', type: 'case',
    question: 'Кейс: есть свободные 30 000 ₽ и нет подушки безопасности. Куда логичнее сначала?',
    options: ['Купить акции одной компании', 'Сформировать резерв на накопительном счёте', 'Вложить в крипту', 'Потратить на технику'],
    correctAnswer: 1,
    explanation: 'Без подушки сначала создаём резерв — он защищает от долгов при форс-мажоре.',
  },
  {
    id: 'a4', type: 'case',
    question: 'Кейс: банк предлагает рассрочку 0% на 12 месяцев. В чём чаще подвох?',
    options: ['Подвоха не бывает', 'Цена завышена или есть скрытая страховка', 'Нельзя закрыть досрочно', 'Это всегда выгоднее вклада'],
    correctAnswer: 1,
    explanation: 'Рассрочку «0%» часто компенсируют наценкой или навязанной страховкой — читай условия.',
  },
  {
    id: 'a5', type: 'spend', personal: true,
    question: 'Угадай свои расходы: сколько в среднем уходит на такси за месяц?',
    options: ['до 1 000 ₽', '1 000–3 000 ₽', '3 000–6 000 ₽', 'больше 6 000 ₽'],
    correctAnswer: 1,
    explanation: 'Это персональный вопрос — он помогает заметить, куда реально утекают деньги.',
  },
  {
    id: 'a6', type: 'spend', personal: true,
    question: 'Угадай свои расходы: какая категория съедает больше всего за месяц?',
    options: ['Еда и кафе', 'Транспорт', 'Развлечения', 'Подписки'],
    correctAnswer: 0,
    explanation: 'У большинства людей еда и кафе — крупнейшая управляемая статья расходов.',
  },
  {
    id: 'a7', type: 'term',
    question: 'Что такое «сложный процент»?',
    options: ['Процент только на первоначальную сумму', 'Процент, начисляемый в том числе на ранее начисленные проценты', 'Комиссия за перевод', 'Налог на доход'],
    correctAnswer: 1,
    explanation: 'Сложный процент — это проценты на проценты, главный двигатель долгих накоплений.',
  },
  {
    id: 'a8', type: 'case',
    question: 'Кейс: пришла зарплата. Какой порядок здоровее?',
    options: ['Сначала все траты, остаток — отложить', 'Сначала отложить часть, потом тратить', 'Потратить всё сразу', 'Перевести всё в наличные'],
    correctAnswer: 1,
    explanation: 'Принцип «сначала заплати себе»: откладывай в начале месяца, а не по остатку.',
  },
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getDuelQuestions(count = 5): ArenaQuestion[] {
  return shuffle(ARENA_QUESTIONS).slice(0, Math.min(count, ARENA_QUESTIONS.length));
}

// Вопрос дня — детерминирован по дате, чтобы у всех был «один и тот же».
export function getDailyQuestion(): ArenaQuestion {
  const today = new Date();
  const seed = today.getFullYear() * 1000 + (today.getMonth() + 1) * 50 + today.getDate();
  return ARENA_QUESTIONS[seed % ARENA_QUESTIONS.length];
}

// ─── Боты-соперники для дуэли ───────────────────────────────────────────────
export interface Bot { name: string; emoji: string }
export const BOT_OPPONENTS: Bot[] = [
  { name: 'Костя Капитал', emoji: '🦊' },
  { name: 'Инна Инвест', emoji: '🦉' },
  { name: 'Дима Депозит', emoji: '🐻' },
  { name: 'Лера Ликвид', emoji: '🐰' },
];

export function getRandomBot(): Bot {
  return BOT_OPPONENTS[Math.floor(Math.random() * BOT_OPPONENTS.length)];
}
