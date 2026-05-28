import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/formatters';
import type { ChatMessage } from '@/shared/types';

// ─── Mock AI responses ─────────────────────────────────────────────────────────

const getAiResponse = (userMsg: string, _profile: ReturnType<typeof import('@/entities/finance/model/financeStore').useFinanceStore>['profile']): string => {
  const msg = userMsg.toLowerCase();

  if (msg.includes('расход') || msg.includes('трат') || msg.includes('сколько')) {
    return `📊 Анализирую ваши расходы за май:\n\n• Еда: 18 400 ₽ из 20 000 ₽ (92% бюджета)\n• Жильё: 25 000 ₽ — в норме\n• Подписки: ⚠️ перерасход на 100 ₽\n\nОбщий бюджет использован на **76%**. Темп расходов нормальный.`;
  }
  if (msg.includes('сэкономить') || msg.includes('экономить') || msg.includes('совет')) {
    return `💡 Вот 3 способа сэкономить прямо сейчас:\n\n1. **Яндекс Плюс** покрывает часть функций Spotify — можно отписаться и сэкономить 299 ₽/мес\n2. Готовь дома 2 раза в неделю — минус ~3 000 ₽ на еде\n3. Переведи 10% дохода в накопления сразу после зарплаты`;
  }
  if (msg.includes('цел') || msg.includes('накоп') || msg.includes('отпуск')) {
    return `✈️ Цель «Отпуск в Турции»:\n\n• Накоплено: 54 000 ₽ из 120 000 ₽ (45%)\n• До дедлайна: ~33 дня\n• Нужно откладывать: **~2 000 ₽/день**\n\nПри текущем темпе сбережений вы наберёте 87 000 ₽ — немного не хватит. Рекомендую временно сократить развлечения.`;
  }
  if (msg.includes('подписк') || msg.includes('netflix') || msg.includes('spotify')) {
    return `📱 Ваши активные подписки:\n\n• Яндекс Плюс — 399 ₽\n• Spotify — 299 ₽\n• Netflix — 799 ₽\n• iCloud — 59 ₽\n• ChatGPT Plus — 1 800 ₽\n\n**Итого: 3 356 ₽/мес**\n\nЯндекс Плюс и Spotify частично дублируются. Отписка от Spotify сэкономит 3 588 ₽/год.`;
  }
  if (msg.includes('стресс') || msg.includes('нагрузк') || msg.includes('долг') || msg.includes('кредит')) {
    return `📉 Ваш финансовый стресс-индекс: **42/100** — умеренный уровень.\n\nОсновные факторы:\n• Кредитная нагрузка в норме\n• Подушка безопасности заполнена на 24%\n• Расходы предсказуемы\n\nЧтобы снизить стресс, рекомендую довести подушку безопасности до 3 месяцев расходов (примерно 204 000 ₽).`;
  }
  if (msg.includes('баланс') || msg.includes('счёт') || msg.includes('деньг')) {
    return `💰 Текущий баланс: **87 430 ₽**\n\nЗа май:\n• Доходы: +120 000 ₽\n• Расходы: −68 200 ₽\n• Сбережения: +14 800 ₽ (12.3%)\n\nЦелевая норма сбережений — 20%. До цели осталось сократить расходы примерно на 9 400 ₽.`;
  }
  if (msg.includes('привет') || msg.includes('здравств') || msg.includes('привет')) {
    return `Привет! 👋 Я ваш AI-финансовый помощник.\n\nМогу помочь с:\n• 📊 Анализом расходов\n• 💡 Советами по экономии\n• ✈️ Прогрессом по целям\n• 📱 Оптимизацией подписок\n• 📉 Прогнозами бюджета\n\nС чего начнём?`;
  }

  return `Понял ваш запрос! 🤔\n\nПока я анализирую данные... Если кратко:\n\n• Ваши расходы в **норме** на этот месяц\n• Цели продвигаются — отпуск на 45%\n• Есть пара подписок, которые можно оптимизировать\n\nЗадайте более конкретный вопрос — например, «сколько потратил на еду» или «как сэкономить».`;
};

// ─── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: '📊', text: 'Расходы за месяц' },
  { icon: '💡', text: 'Как сэкономить?' },
  { icon: '✈️', text: 'Прогресс по целям' },
  { icon: '📱', text: 'Оптимизировать подписки' },
];

// ─── Typing indicator ──────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        className="w-2 h-2 rounded-full bg-text-tertiary"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
);

// ─── Message bubble ────────────────────────────────────────────────────────────

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold mr-2 mt-auto flex-shrink-0">
          AI
        </div>
      )}
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-gradient-primary text-white rounded-br-sm'
          : 'bg-white shadow-card text-text-primary rounded-bl-sm'
      )}>
        {msg.isTyping ? (
          <TypingIndicator />
        ) : (
          <p className="whitespace-pre-line">{msg.content}</p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Chat ─────────────────────────────────────────────────────────────────

let msgId = 0;
const newId = () => String(++msgId);

const INITIAL_MSG: ChatMessage = {
  id: '0',
  role: 'ai',
  content: 'Привет! 👋 Я ваш AI-финансовый помощник.\n\nМогу помочь с анализом расходов, советами по экономии и прогрессом по целям.\n\nС чего начнём?',
  timestamp: new Date().toISOString(),
};

export const ChatPage = () => {
  const user = useUserStore(s => s.user);
  const { profile } = useFinanceStore();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(scrollToBottom, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // TEMP: ping backend health endpoint; reply "абоообаа" on HTTP 200.
    let content: string;
    try {
      const res = await fetch('http://localhost:8000/api/v1/health');
      content = res.status === 200 ? 'абоообаа' : `Сервер вернул статус ${res.status}`;
    } catch {
      content = 'Не удалось подключиться к серверу';
    }

    const aiMsg: ChatMessage = {
      id: newId(),
      role: 'ai',
      content,
      timestamp: new Date().toISOString(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, aiMsg]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const firstName = user?.name.split(' ')[0] ?? 'Гость';

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base">
      {/* ── Header ── */}
      <div className="glass border-b border-border sticky top-0 z-20 px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="white" opacity="0.2"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
              <path d="M12 5V7M12 17V19M5 12H7M17 12H19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-text-primary">Финансовый AI</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-text-tertiary">Онлайн</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 pb-6">

        {/* Welcome chip */}
        <div className="flex justify-center">
          <span className="text-xs text-text-tertiary bg-border-light px-3 py-1 rounded-full">
            Сегодня
          </span>
        </div>

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                AI
              </div>
              <div className="bg-white shadow-card rounded-2xl rounded-bl-sm px-1">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts ── */}
      {messages.length <= 2 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.text}
              onClick={() => sendMessage(p.text)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-border rounded-xl text-sm font-medium text-text-primary shadow-card whitespace-nowrap"
            >
              <span>{p.icon}</span>
              <span>{p.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div className="glass border-t border-border px-4 py-3 pb-safe-bottom"
           style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Спросить AI, ${firstName}...`}
            className="flex-1 h-11 px-4 bg-bg-muted border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200',
              input.trim() && !isTyping
                ? 'bg-gradient-primary shadow-primary text-white scale-100'
                : 'bg-border-light text-text-tertiary'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
