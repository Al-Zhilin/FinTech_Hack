import mascotImg from '@/assets/mascot-advisor.png';

interface MascotAdvisorProps {
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const MascotAdvisor = ({ children, size = 'md', className = '' }: MascotAdvisorProps) => {
  const imgSize = size === 'sm' ? 'w-14 h-14' : 'w-16 h-16';

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <img
        src={mascotImg}
        alt="Финансовый советчик"
        className={`${imgSize} flex-shrink-0 object-contain drop-shadow-sm`}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};
