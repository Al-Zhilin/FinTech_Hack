import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/config/i18n';
import { NAV_ITEMS } from '@/widgets/nav/navItems';

// Нижнее меню — только на мобильных. На десктопе (≥768px) скрыто, его
// заменяет боковая панель SideNav (см. desktop-only класс).
export const BottomNav = () => {
  const t = useT();
  return (
  <nav className="app-bottom-nav md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile z-50 glass border-t border-border shadow-bottom-nav shadow-black/10"
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
