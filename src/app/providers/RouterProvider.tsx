import { createBrowserRouter, RouterProvider as BaseRouterProvider, Navigate } from 'react-router-dom';
import { useUserStore } from '@/entities/user/model/userStore';
import { AppLayout } from '@/widgets/app-layout/AppLayout';
import { OnboardingPage } from '@/pages/onboarding';
import { DashboardPage } from '@/pages/dashboard';
import { ChatPage } from '@/pages/chat';
import { ProfilePage } from '@/pages/profile';
import { GoalsPage } from '@/pages/goals';
import { AnalyticsPage } from '@/pages/analytics';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useUserStore(s => s.isAuthenticated);
  return isAuth ? <>{children}</> : <Navigate to="/onboarding" replace />;
};

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useUserStore(s => s.isAuthenticated);
  return isAuth ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/onboarding" replace />,
  },
  {
    path: '/onboarding',
    element: (
      <OnboardingGuard>
        <OnboardingPage />
      </OnboardingGuard>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'chat',      element: <ChatPage /> },
      { path: 'profile',   element: <ProfilePage /> },
      { path: 'goals',     element: <GoalsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], { basename: '/ekvator' });

export const RouterProvider = () => <BaseRouterProvider router={router} />;
