import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/entities/chat/model/chatStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import type { FinancialProfile } from '@/shared/types';

// Добавляет к вопросу компактный финансовый контекст — он уходит на бэкенд,
// чтобы AI анализировал ответ с учётом данных пользователя.
export const withFinancialContext = (question: string, p: FinancialProfile): string =>
  `${question}\n\n[Мои данные: доход ${p.monthlyIncome} ₽/мес, расходы ${p.monthlySpent} ₽/мес, ` +
  `баланс ${p.balance} ₽, норма сбережений ${p.savingsRate}%.]`;

/**
 * Возвращает функцию ask(question, opts): кладёт готовый промт (с данными пользователя)
 * и уводит в чат с AI. display — текст в пузыре пользователя (по умолчанию question).
 * Используется кнопками-вопросами по всему приложению.
 */
export const useAskAi = () => {
  const navigate = useNavigate();
  const setPending = useChatStore(s => s.setPending);
  const profile = useFinanceStore(s => s.profile);

  return (question: string, options?: { beforeNavigate?: () => void; display?: string }) => {
    setPending({
      display: options?.display ?? question,
      payload: withFinancialContext(question, profile),
    });
    options?.beforeNavigate?.();
    navigate('/chat');
  };
};
