import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RequireAuth } from '@/auth/require-auth';
import { RoleGuard } from '@/auth/role-guard';
import { ProfileGate } from '@/auth/profile-gate';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from './routes/HomePage';
import { DashboardPage } from './routes/DashboardPage';
import { ExpiredPage } from './routes/ExpiredPage';
import { UnauthorizedPage } from './routes/UnauthorizedPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { ComingSoonPage } from './routes/ComingSoonPage';
import { SignInPage } from '@/features/auth/routes/SignInPage';
import { CompleteProfilePage } from '@/features/onboarding/routes/CompleteProfilePage';
import { LPProfilePage } from '@/features/onboarding/routes/LPProfilePage';

const PageLoader = () => <div className="p-8 text-sm text-ink-muted">Loading…</div>;

function Lazy({ importer }: { importer: () => Promise<{ default: React.ComponentType }> }) {
  const C = lazy(importer);
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/signin', element: <SignInPage /> },
  { path: '/expired', element: <ExpiredPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding/profile', element: <CompleteProfilePage /> },
      { path: '/onboarding/lp-profile', element: <LPProfilePage /> },
      {
        element: <ProfileGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              {
                path: '/documents',
                element: (
                  <ComingSoonPage
                    title="Documents"
                    description="Document vault activates in Phase 4 (see PRD §13 G3). Until then, please share docs via the existing channel."
                  />
                ),
              },
              {
                path: '/digest',
                element: (
                  <ComingSoonPage
                    title="My digest"
                    description="User-side digest preview is a Phase 4 screen (see PRD §10.5). Admin digest workflows are available from the admin area."
                    backTo="/dashboard"
                  />
                ),
              },
              {
                element: <RoleGuard roles={['admin', 'super_admin']} />,
                children: [
                  {
                    path: '/admin',
                    element: <Lazy importer={() => import('./routes/AdminHomePlaceholder')} />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
