import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/config/i18n';

const NAV_ITEMS = [
  { to: '/dashboard', icon: HomeIcon,      tkey: 'nav.home',    highlight: false },
  { to: '/finance',   icon: WalletIcon,    tkey: 'nav.finance', highlight: false },
  { to: '/chat',      icon: AiIcon,        tkey: 'nav.ai',      highlight: true },
  { to: '/goals',     icon: GoalsIcon,     tkey: 'nav.goals',   highlight: false },
  { to: '/profile',   icon: ProfileIcon,   tkey: 'nav.profile', highlight: false },
] as const;

export const BottomNav = () => {
  const t = useT();
  return (
  <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile z-50 glass border-t border-border shadow-bottom-nav"
       style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
    <div className="flex items-center justify-around h-16 px-2">
      {NAV_ITEMS.map(({ to, icon: Icon, tkey, highlight }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
               isActive ? 'text-primary' : 'text-text-tertiary',
               highlight && 'relative'
            )
          }
        >
          {({ isActive }) => (
            <>
              {highlight ? (
                <span className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center -mt-6 shadow-primary transition-all duration-200',
                  isActive ? 'bg-gradient-primary scale-105' : 'bg-gradient-primary opacity-90'
                )}>
                  <Icon size={22} className="text-white" />
                </span>
              ) : (
                <span className={cn(
                  'w-6 h-6 flex items-center justify-center transition-all duration-200',
                  isActive && 'scale-110'
                )}>
                  <Icon size={22} />
                </span>
              )}
              <span className={cn('text-[10px] font-medium', highlight && 'mt-1')}>
                {t(tkey)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
  );
};

// ─── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WalletIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 7C3 5.895 3.895 5 5 5H17C18.105 5 19 5.895 19 7V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="16.5" cy="13.5" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function AiIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  );
}

function GoalsIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function ProfileIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
