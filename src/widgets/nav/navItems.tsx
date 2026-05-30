import React from 'react';

// Общие пункты навигации для нижнего меню (моб.) и боковой панели (десктоп).

export interface NavIconProps { size?: number; className?: string }

export function HomeIcon({ size = 24, className = '' }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function WalletIcon({ size = 24, className = '' }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 7C3 5.895 3.895 5 5 5H17C18.105 5 19 5.895 19 7V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="16.5" cy="13.5" r="1.5" fill="currentColor"/>
    </svg>
  );
}

export function AiIcon({ size = 24, className = '' }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Голова робота */}
      <rect x="4" y="7" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      {/* Антенна */}
      <path d="M12 4V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="3.5" r="1" fill="currentColor"/>
      {/* Глаза */}
      <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
      {/* Рот */}
      <path d="M9 15.5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Уши / боковые порты */}
      <path d="M4 11H2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M20 11H21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function ArenaIcon({ size = 24, className = '' }: NavIconProps) {
  // Кошачья лапка — символ Арены и КопиКота
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="15.5" rx="4.5" ry="3.8" fill="currentColor"/>
      <ellipse cx="6.5" cy="10" rx="1.8" ry="2.4" fill="currentColor"/>
      <ellipse cx="17.5" cy="10" rx="1.8" ry="2.4" fill="currentColor"/>
      <ellipse cx="9.5" cy="6.5" rx="1.7" ry="2.2" fill="currentColor"/>
      <ellipse cx="14.5" cy="6.5" rx="1.7" ry="2.2" fill="currentColor"/>
    </svg>
  );
}

export function ProfileIcon({ size = 24, className = '' }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export interface NavItem {
  to: string;
  icon: (p: NavIconProps) => React.ReactElement;
  tkey: string;
  highlight: boolean; // центральная акцентная кнопка в мобильном меню
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: HomeIcon,    tkey: 'nav.home',    highlight: false },
  { to: '/finance',   icon: WalletIcon,  tkey: 'nav.finance', highlight: false },
  { to: '/chat',      icon: AiIcon,      tkey: 'nav.ai',      highlight: false },
  { to: '/arena',     icon: ArenaIcon,   tkey: 'nav.arena',   highlight: false },
  { to: '/profile',   icon: ProfileIcon, tkey: 'nav.profile', highlight: false },
];
