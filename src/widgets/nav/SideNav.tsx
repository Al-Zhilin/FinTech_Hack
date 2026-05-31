import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/config/i18n';
import { useUserStore } from '@/entities/user/model/userStore';
import { NAV_ITEMS } from './navItems';

// Боковая панель навигации — только на десктопе (≥768px).
// На мобильных скрыта (desktop-only класс), там работает BottomNav.
export const SideNav = () => {
  const t = useT();
  const user = useUserStore(s => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'Гость';

  return (
    <aside className="app-side-nav hidden md:flex shrink-0 w-64 flex-col bg-white border-r border-border">
      {/* Логотип / бренд */}
      <div className="flex items-center gap-2.5 px-5 h-[72px] border-b border-border-light">
        <span className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
          <span className="text-white font-extrabold text-lg leading-none">Э</span>
        </span>
        <span className="font-extrabold text-lg text-text-primary">Эквватор</span>
      </div>

      {/* Пункты меню */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, tkey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all duration-200',
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('w-6 h-6 flex items-center justify-center transition-transform', isActive && 'scale-110')}>
                  <Icon size={22} />
                </span>
                <span className="text-[15px]">{t(tkey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Карточка пользователя */}
      <div className="px-3 pb-4">
        <NavLink to="/profile" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-bg-muted transition-colors">
          <span className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold shadow-primary">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{firstName}</p>
            <p className="text-xs text-text-tertiary truncate">{user?.email ?? 'Профиль'}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};
