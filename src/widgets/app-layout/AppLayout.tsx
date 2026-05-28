import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/widgets/bottom-nav/BottomNav';

export const AppLayout = () => (
  <div className="relative w-full max-w-mobile h-dvh bg-bg-base flex flex-col overflow-hidden">
    <main className="flex-1 pb-20 overflow-y-auto">
      <Outlet />
    </main>
    <BottomNav />
  </div>
);
