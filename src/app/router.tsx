import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
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

// Per decisions.md [P-19]: every new feature route is lazy-split. Hoisted to module
// scope so React.lazy de-dupes module loads (a Lazy() wrapper rebuilt per render
// would re-create the lazy boundary on every navigation).
const CompleteProfilePage = lazy(() =>
  import('@/features/onboarding/routes/CompleteProfilePage').then((m) => ({
    default: m.CompleteProfilePage,
  })),
);
const LPProfilePage = lazy(() =>
  import('@/features/onboarding/routes/LPProfilePage').then((m) => ({
    default: m.LPProfilePage,
  })),
);
const SearchPage = lazy(() =>
  import('@/features/search/routes/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const AdminConnectionsPage = lazy(() =>
  import('@/features/admin/routes/AdminConnectionsPage').then((m) => ({
    default: m.AdminConnectionsPage,
  })),
);
const AdminHomePlaceholder = lazy(() => import('./routes/AdminHomePlaceholder'));

const PageLoader = () => <div className="p-8 text-sm text-ink-muted">Loading…</div>;

function Susp({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter(
  [
    { path: '/', element: <HomePage /> },
    { path: '/signin', element: <SignInPage /> },
    { path: '/expired', element: <ExpiredPage /> },
    { path: '/unauthorized', element: <UnauthorizedPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          path: '/onboarding/profile',
          element: (
            <Susp>
              <CompleteProfilePage />
            </Susp>
          ),
        },
        {
          path: '/onboarding/lp-profile',
          element: (
            <Susp>
              <LPProfilePage />
            </Susp>
          ),
        },
        {
          element: <ProfileGate />,
          children: [
            {
              element: <AppShell />,
              children: [
                { path: '/dashboard', element: <DashboardPage /> },
                {
                  // Partner is admitted with masked results (backend strips
                  // fields via _STARTUP_VISIBLE_FIELDS["partner"]). PRD §7.4.1.
                  element: (
                    <RoleGuard
                      roles={[
                        'lp',
                        'potential_lp',
                        'vc',
                        'startup_funded',
                        'partner',
                        'admin',
                        'super_admin',
                      ]}
                    />
                  ),
                  children: [
                    {
                      path: '/search',
                      element: (
                        <Susp>
                          <SearchPage />
                        </Susp>
                      ),
                    },
                  ],
                },
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
                      element: (
                        <Susp>
                          <AdminHomePlaceholder />
                        </Susp>
                      ),
                    },
                    {
                      path: '/admin/connections',
                      element: (
                        <Susp>
                          <AdminConnectionsPage />
                        </Susp>
                      ),
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
  ],
  {
    // Opt into v7 behaviour now to silence the dev-mode warnings and keep the
    // upgrade path painless. No behavioural difference at v6 runtime.
    future: {
      v7_relativeSplatPath: true,
      // v7_startTransition isn't part of v6.30's typed future options yet; the
      // typed cast keeps tsc quiet while still propagating the runtime flag.
      ...({ v7_startTransition: true } as Record<string, boolean>),
    },
  },
);
