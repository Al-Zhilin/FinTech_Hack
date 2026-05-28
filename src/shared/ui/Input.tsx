import { forwardRef } from 'react';
import { cn } from '../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '_');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className={cn(
          'flex items-center gap-2 h-12 px-4 rounded-lg bg-bg-muted border transition-all duration-150',
          error ? 'border-danger' : 'border-border focus-within:border-primary',
        )}>
          {prefix && <span className="text-text-tertiary flex-shrink-0">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary text-base outline-none',
              className
            )}
            {...props}
          />
          {suffix && <span className="text-text-tertiary flex-shrink-0">{suffix}</span>}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
