import { cn } from '../lib/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'purple' | 'success' | 'warning' | 'danger' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge = ({ children, variant = 'muted', size = 'sm', className }: BadgeProps) => {
  const variants = {
    primary: 'bg-primary-light text-primary',
    purple: 'bg-purple-light text-purple-dark',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
    muted: 'bg-border-light text-text-secondary',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs rounded-xs',
    md: 'px-3 py-1 text-sm rounded-sm',
  };

  return (
    <span className={cn('inline-flex items-center font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};
