import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useAskAi } from './useAskAi';

interface AskAiButtonProps {
  /** Вопрос, который увидит пользователь в чате и который уйдёт к AI (с данными). */
  question: string;
  /** Текст на кнопке. По умолчанию совпадает с вопросом. */
  label?: string;
  /** solid — заметная coral-кнопка; chip — компактная ссылка-чип внутри карточек. */
  variant?: 'solid' | 'chip';
  className?: string;
}

export const AskAiButton = ({
  question,
  label,
  variant = 'chip',
  className,
}: AskAiButtonProps) => {
  const ask = useAskAi();
  const text = label ?? question;

  if (variant === 'solid') {
    return (
      <button
        onClick={() => ask(question)}
        className={cn(
          'w-full h-12 rounded-2xl bg-gradient-primary text-white font-semibold text-[15px]',
          'flex items-center justify-center gap-2 shadow-primary active:scale-[0.97] transition-transform',
          className,
        )}
      >
        <Sparkles size={16} />
        <span>{text}</span>
        <ArrowRight size={16} />
      </button>
    );
  }

  // chip
  return (
    <button
      onClick={() => ask(question)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-primary-light text-primary font-semibold text-sm',
        'active:scale-[0.96] transition-transform',
        className,
      )}
    >
      <Sparkles size={14} />
      <span>{text}</span>
    </button>
  );
};
