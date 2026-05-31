import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/widgets/bottom-nav/BottomNav';
import { SideNav } from '@/widgets/nav/SideNav';
import { WeeklyRecapReels } from '@/widgets/weekly-recap/WeeklyRecapReels';
import { PersonalCoach } from '@/widgets/coach/PersonalCoach';
import { Tutorial } from '@/widgets/tutorial/Tutorial';

export const AppLayout = () => (
  <div className="app-shell relative w-full max-w-mobile h-dvh bg-bg-base flex overflow-hidden">
    <SideNav />
    <div className="app-frame relative flex-1 min-w-0 flex flex-col overflow-hidden">
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <WeeklyRecapReels />
      <PersonalCoach />
      <Tutorial />
    </div>
  </div>
);
