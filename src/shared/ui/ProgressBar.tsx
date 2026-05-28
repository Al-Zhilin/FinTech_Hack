import { cn } from '../lib/cn';

interface ProgressBarProps {
  value: number; // 0–100
  max?: number;
  color?: 'primary' | 'purple' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  animated?: boolean;
  className?: string;
}

export const ProgressBar = ({
  value,
  max = 100,
  color = 'primary',
  size = 'sm',
  animated = true,
  className,
}: ProgressBarProps) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const trackColors = {
    primary: 'bg-primary/15',
    purple: 'bg-purple/15',
    success: 'bg-success/15',
    warning: 'bg-warning/15',
    danger: 'bg-danger/15',
  };

  const fillColors = {
    primary: 'bg-gradient-primary',
    purple: 'bg-gradient-purple',
    success: 'bg-gradient-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  const heights = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  return (
    <div className={cn('w-full rounded-pill overflow-hidden', trackColors[color], heights[size], className)}>
      <div
        className={cn('h-full rounded-pill', fillColors[color], animated && 'transition-all duration-700 ease-out')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
