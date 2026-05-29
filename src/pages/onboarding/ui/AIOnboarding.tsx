import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/Button';
import { onboardingStep } from '@/shared/api/onboarding';

interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface AIOnboardingProps {
  userLogin: string;
  onBack: () => void;
  onComplete: (profileSummary: string) => void;
}

const TOTAL_QUESTIONS = 9;

const STATUS_LABELS: Record<string, string> = {
  queued: 'В очереди...',
  processing: 'Обрабатываем...',
  searching: 'Ищем данные...',
  analyzing: 'Анализируем...',
};

export const AIOnboarding = ({ userLogin, onBack, onComplete }: AIOnboardingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addAIMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', text }]);
  }, []);

  const send = useCallback(async (message: string) => {
    setIsLoading(true);
    setError(null);
    setStatusText(null);

    try {
      const result = await onboardingStep(
        userLogin,
        message,
        (status) => setStatusText(STATUS_LABELS[status] ?? status),
      );

      setStatusText(null);

      if (result.complete) {
        setIsComplete(true);
        addAIMessage(
          result.profile_summary ??
          'Отлично! Ваш финансовый профиль готов. Добро пожаловать в КопиКот!'
        );
      } else if (result.question) {
        setQuestionNum(n => n + 1);
        addAIMessage(result.question);
      }

      if (result.error && !result.complete) {
        // Non-blocking error: backend still returned a valid question
        console.warn('Backend error:', result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  }, [userLogin, addAIMessage]);

  // Initiate onboarding on mount (StrictMode-safe)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    send('Привет');
  }, [send]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading || isComplete) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
    setLastUserMessage(text);
    setInputValue('');
    send(text);
  };

  const handleRetry = () => {
    send(lastUserMessage || 'Привет');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const progress = Math.min(questionNum / TOTAL_QUESTIONS, 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-border-light">
        <motion.div
          className="h-full bg-gradient-primary"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-9 h-9 rounded-full bg-border-light flex items-center justify-center text-text-secondary disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">Финансовый помощник</div>
          <div className="text-xs text-text-tertiary">
            {isComplete
              ? 'Профиль создан!'
              : questionNum > 0
              ? `Вопрос ${questionNum} из ${TOTAL_QUESTIONS}`
              : 'Начинаем знакомство...'}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-primary flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gradient-primary text-white rounded-2xl rounded-br-md'
                    : 'bg-bg-muted text-text-primary rounded-2xl rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex flex-col gap-2">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-text-tertiary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
                  />
                ))}
              </div>
              {statusText && (
                <span className="text-xs text-text-tertiary">{statusText}</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-sm text-danger text-center">{error}</p>
              <button
                onClick={handleRetry}
                className="text-sm text-primary font-semibold"
              >
                Попробовать снова
              </button>
            </div>
          </motion.div>
        )}

        {/* Complete action */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center py-2"
          >
            <Button size="lg" fullWidth onClick={() => onComplete('')}>
              Войти в приложение
            </Button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isComplete && (
        <div className="px-4 pb-6 pt-3 border-t border-border-light flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? 'Ожидайте...' : 'Напишите ответ...'}
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-border bg-bg-muted px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary transition-colors disabled:opacity-50 leading-relaxed"
              style={{ maxHeight: '96px', overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
