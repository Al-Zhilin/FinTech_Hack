import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/widgets/bottom-nav/BottomNav';
import { SideNav } from '@/widgets/nav/SideNav';
import { WeeklyRecapReels } from '@/widgets/weekly-recap/WeeklyRecapReels';
import { PersonalCoach } from '@/widgets/coach/PersonalCoach';

// Адаптивный каркас приложения.
//  • Мобильные (<768px): одна колонка max-w-mobile + нижнее меню (BottomNav).
//  • Десктоп (≥768px): «окно приложения» = боковая панель (SideNav) + панель
//    контента. PersonalCoach — floating кнопка наставника, живёт поверх всего.
export const AppLayout = () => (
  <div className="app-shell relative w-full max-w-mobile h-dvh bg-bg-base flex overflow-hidden">
    <SideNav />

    {/* Колонка контента — она же «телефонный фрейм» на десктопе */}
    <div className="app-frame relative flex-1 min-w-0 flex flex-col overflow-hidden">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <WeeklyRecapReels />
      {/* Личный наставник — живёт поверх всего контента */}
      <PersonalCoach />
    </div>
  </div>
);
