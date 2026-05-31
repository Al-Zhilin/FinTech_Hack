import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useUserStore } from '@/entities/user/model/userStore';
import { useChatStore } from '@/entities/chat/model/chatStore';
import { sendChatMessage } from '@/shared/api/chat';
import { cn } from '@/shared/lib/cn';
import { CalculatorResultCard } from '@/widgets/chat/CalculatorResultCard';
import { ChatTable, ChatTableData, MarkdownTable } from '@/widgets/chat/ChatTable';
import type { ChatMessage } from '@/shared/types';

// ─── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: '📊', text: 'Проанализируй мои расходы за месяц' },
  { icon: '💡', text: 'Как мне сэкономить?' },
  { icon: '✈️', text: 'Как у меня дела с целями?' },
  { icon: '📱', text: 'Какие подписки можно отменить?' },
];

const STATUS_LABELS: Record<string, string> = {
  queued: 'В очереди…',
  processing: 'Обрабатываю…',
  searching: 'Ищу актуальные данные…',
  analyzing: 'Анализирую ваши финансы…',
};

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

// ─── Markdown prose styles ─────────────────────────────────────────────────────

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p:          ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
  strong:     ({ children }) => <strong className="font-bold">{children}</strong>,
  em:         ({ children }) => <em className="italic opacity-90">{children}</em>,
  ul:         ({ children }) => <ul className="list-disc pl-4 mb-1.5 flex flex-col gap-0.5">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal pl-4 mb-1.5 flex flex-col gap-0.5">{children}</ol>,
  li:         ({ children }) => <li className="leading-snug">{children}</li>,
  h1:         ({ children }) => <h1 className="font-extrabold text-base mb-2 mt-1 border-b border-current/10 pb-1">{children}</h1>,
  h2:         ({ children }) => <h2 className="font-bold text-sm mb-1.5 mt-1">{children}</h2>,
  h3:         ({ children }) => <h3 className="font-semibold text-sm mb-1 mt-0.5 text-primary/90">{children}</h3>,
  code:       ({ children }) => (
    <code className="bg-black/10 rounded-md px-1.5 py-0.5 text-xs font-mono tracking-tight">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-primary/40 pl-3 opacity-85 my-1.5 italic">{children}</blockquote>
  ),
  hr: () => <hr className="border-current/15 my-2" />,
  // ── Таблицы: красиво оформляем прямо внутри пузыря ──────────────────────────
  table: ({ children }) => <MarkdownTable>{children}</MarkdownTable>,
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr:    ({ children }) => <tr>{children}</tr>,
  th:    ({ children }) => <th>{children}</th>,
  td:    ({ children }) => <td>{children}</td>,
};

// ─── Message bubble ────────────────────────────────────────────────────────────

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === 'user';
  const hasCalcResult =
    !isUser &&
    msg.calculator_result &&
    Object.keys(msg.calculator_result).length > 0;

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className={cn('flex', isUser ? 'justify-end' : 'justify-start', 'w-full')}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold mr-2 mt-auto flex-shrink-0">
            AI
          </div>
        )}
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'max-w-[78%] bg-gradient-primary text-white rounded-br-sm'
            // AI-пузырь: без max-w чтобы таблицы не обрезались, но ограничен родителем
            : 'w-full max-w-[calc(100%-40px)] bg-white shadow-card text-text-primary rounded-bl-sm overflow-hidden'
        )}>
          {isUser ? (
            <p className="whitespace-pre-line">{msg.content}</p>
          ) : (
            <ReactMarkdown components={mdComponents}>
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
      </motion.div>

      {msg.tableData && <ChatTableData data={msg.tableData} />}
      {msg.table && !msg.tableData && <ChatTable html={msg.table} />}

      {hasCalcResult && (
        <CalculatorResultCard result={msg.calculator_result!} />
      )}
    </div>
  );
};

// ─── Main Chat ─────────────────────────────────────────────────────────────────

let msgId = 0;
const newId = () => String(++msgId);

// Извлекает <table>{JSON}<table> или <table>{JSON}</table> из текста,
// возвращает очищенный текст и данные таблицы.
function extractTableFromText(text: string): {
  cleanText: string;
  tableData: { headers: string[]; rows: string[][] } | null;
} {
  const regex = /<table>([\s\S]*?)(?:<\/table>|<table>)/g;
  let tableData: { headers: string[]; rows: string[][] } | null = null;
  const cleanText = text.replace(regex, (_, content) => {
    if (!tableData) {
      try {
        const parsed = JSON.parse(content.trim());
        if (Array.isArray(parsed?.headers) && Array.isArray(parsed?.rows)) {
          tableData = parsed;
        }
      } catch { /* ignore */ }
    }
    return '';
  }).trim();
  return { cleanText, tableData };
}

const INITIAL_MSG: ChatMessage = {
  id: '0',
  role: 'ai',
  content: 'Привет! 👋 Я ваш AI-финансовый помощник.\n\nМогу помочь с анализом расходов, советами по экономии и прогрессом по целям.\n\nС чего начнём?',
  timestamp: new Date().toISOString(),
};

export const ChatPage = () => {
  const user = useUserStore(s => s.user);
  const consumePending = useChatStore(s => s.consume);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef(false);

  const login = user?.email ?? 'guest';

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(scrollToBottom, [messages, isTyping]);

  // display — текст в пузыре пользователя; payload — то, что реально уходит на бэкенд
  const send = async (display: string, payload: string) => {
    if (!display.trim() || isTyping) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      content: display.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setStatus(null);

    let content: string;
    let calcResult = undefined;
    let tableHtml: string | undefined = undefined;
    let tableData: { headers: string[]; rows: string[][] } | undefined = undefined;
    try {
      const result = await sendChatMessage(login, payload, (raw) =>
        setStatus(STATUS_LABELS[raw] ?? raw),
      );

      content = result.text || 'Не удалось получить ответ. Попробуйте переформулировать вопрос.';

      // 1. Таблица из смешанного формата {json}<table>...</table> (через sse.ts)
      if (result._tableJson) {
        tableData = result._tableJson;
      }

      // 2. Таблица, встроенная в сам текст ответа: <table>{JSON}<table>
      if (!tableData && content.includes('<table>')) {
        const extracted = extractTableFromText(content);
        content = extracted.cleanText || content;
        if (extracted.tableData) tableData = extracted.tableData;
      }

      // 3. HTML-таблица (устаревший формат, оставляем для совместимости)
      if (!tableData) {
        tableHtml = result.table ?? result.structured?.table ?? undefined;
      }

      const cr = result.structured?.calculator_result;
      if (cr && Object.keys(cr).length > 0) calcResult = cr;
    } catch {
      content = '⚠️ Не удалось связаться с AI. Проверьте подключение и попробуйте ещё раз.';
    }

    setIsTyping(false);
    setStatus(null);
    setMessages(prev => [...prev, {
      id: newId(),
      role: 'ai',
      content,
      timestamp: new Date().toISOString(),
      calculator_result: calcResult,
      table: tableHtml,
      tableData,
    }]);
  };

  const sendMessage = (text: string) => send(text, text);

  // Автоотправка промта, пришедшего из инсайтов (кнопка «Что с этим делать?»)
  useEffect(() => {
    if (autoSentRef.current) return;
    const pending = consumePending();
    if (pending) {
      autoSentRef.current = true;
      send(pending.display, pending.payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const firstName = user?.name.split(' ')[0] ?? 'Гость';

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base">
      {/* ── Header ── */}
      <div data-tutorial-target="chat-header" className="glass border-b border-border sticky top-0 z-20 px-5 pt-12 md:pt-4 pb-4">
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
              <div className="bg-white shadow-card rounded-2xl rounded-bl-sm px-1 flex items-center">
                <TypingIndicator />
                {status && (
                  <span className="text-xs text-text-tertiary pr-3 -ml-1">{status}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts ── */}
      {messages.length <= 2 && !isTyping && (
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
      <div data-tutorial-target="chat-input" className="glass border-t border-border px-4 py-3 pb-safe-bottom"
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
