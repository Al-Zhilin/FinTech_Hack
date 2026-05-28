import { forwardRef } from 'react';
import { cn } from '../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'purple' | 'muted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  pressable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', pressable, className, children, ...props }, ref) => {
    const base = 'rounded-xl overflow-hidden';

    const variants = {
      default: 'bg-white shadow-card',
      primary: 'bg-gradient-card-pink border border-primary/10',
      purple: 'bg-gradient-card-purple border border-purple/10',
      muted: 'bg-bg-muted',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    };

    return (
      <div
        ref={ref}
        className={cn(
          base,
          variants[variant],
          paddings[padding],
          pressable && 'cursor-pointer active:scale-[0.98] transition-transform duration-150',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
