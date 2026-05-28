import { forwardRef } from 'react';
import { cn } from '../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-pill transition-all duration-200 select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-gradient-primary text-white shadow-primary hover:opacity-90',
      secondary: 'bg-primary-light text-primary hover:bg-primary/10',
      ghost: 'bg-transparent text-text-secondary hover:bg-border-light',
      outline: 'border border-border bg-white text-text-primary hover:bg-border-light',
      danger: 'bg-danger-light text-danger hover:bg-danger/15',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-12 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
