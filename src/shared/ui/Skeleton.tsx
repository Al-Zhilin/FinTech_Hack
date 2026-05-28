import { cn } from '../lib/cn';

interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

export const Skeleton = ({ className, rounded }: SkeletonProps) => (
  <div
    className={cn(
      'animate-pulse bg-gradient-to-r from-border-light via-border to-border-light bg-[length:200%_100%]',
      rounded ? 'rounded-full' : 'rounded-md',
      className
    )}
    style={{ animation: 'shimmer 1.5s infinite linear' }}
  />
);

// Add shimmer keyframes via inline style tag
export const SkeletonStyles = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: 200% 0 }
      100% { background-position: -200% 0 }
    }
  `}</style>
);
