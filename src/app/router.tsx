import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import { RequireAuth } from '@/auth/require-auth';
import { RoleGuard } from '@/auth/role-guard';
import { ProfileGate } from '@/auth/profile-gate';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from './routes/HomePage';
import { DashboardPage } from './routes/DashboardPage';
import { ExpiredPage } from './routes/ExpiredPage';
import { UnauthorizedPage } from './routes/UnauthorizedPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { Susp } from './route-suspense';
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
const SearchDetailPage = lazy(() =>
  import('@/features/search/routes/SearchDetailPage').then((m) => ({
    default: m.SearchDetailPage,
  })),
);
const AdminConnectionsPage = lazy(() =>
  import('@/features/admin/routes/AdminConnectionsPage').then((m) => ({
    default: m.AdminConnectionsPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/routes/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const MyProfilePage = lazy(() =>
  import('@/features/profile/routes/MyProfilePage').then((m) => ({ default: m.MyProfilePage })),
);
const ConnectionsPage = lazy(() =>
  import('@/features/connections/routes/ConnectionsPage').then((m) => ({
    default: m.ConnectionsPage,
  })),
);
const PendingConnectionsPage = lazy(() =>
  import('@/features/connections/routes/PendingConnectionsPage').then((m) => ({
    default: m.PendingConnectionsPage,
  })),
);
const PitchPage = lazy(() =>
  import('@/features/pitch/routes/PitchPage').then((m) => ({ default: m.PitchPage })),
);
const PublicPitchPage = lazy(() =>
  import('@/features/public-pitch/routes/PublicPitchPage').then((m) => ({
    default: m.PublicPitchPage,
  })),
);
const MISPage = lazy(() =>
  import('@/features/mis/routes/MISPage').then((m) => ({ default: m.MISPage })),
);
const SchedulePage = lazy(() =>
  import('@/features/schedule/routes/SchedulePage').then((m) => ({ default: m.SchedulePage })),
);
const TravelPage = lazy(() =>
  import('@/features/travel/routes/TravelPage').then((m) => ({ default: m.TravelPage })),
);
const MatchmakingPage = lazy(() =>
  import('@/features/matchmaking/routes/MatchmakingPage').then((m) => ({
    default: m.MatchmakingPage,
  })),
);
const ProfileViewersPage = lazy(() =>
  import('@/features/profile-viewers/routes/ProfileViewersPage').then((m) => ({
    default: m.ProfileViewersPage,
  })),
);
const AddUserPage = lazy(() =>
  import('@/features/onboarding/routes/AddUserPage').then((m) => ({ default: m.AddUserPage })),
);
const AdminHomePage = lazy(() =>
  import('@/features/admin/routes/AdminHomePage').then((m) => ({ default: m.AdminHomePage })),
);
const AdminReferralsPage = lazy(() =>
  import('@/features/admin/routes/AdminReferralsPage').then((m) => ({
    default: m.AdminReferralsPage,
  })),
);
const AdminDigestPage = lazy(() =>
  import('@/features/digest/routes/AdminDigestPage').then((m) => ({ default: m.AdminDigestPage })),
);
const AdminMatchmakingOpsPage = lazy(() =>
  import('@/features/matchmaking/routes/AdminMatchmakingOpsPage').then((m) => ({
    default: m.AdminMatchmakingOpsPage,
  })),
);
const AdminQuarterlyReportsPage = lazy(() =>
  import('@/features/admin/routes/AdminQuarterlyReportsPage').then((m) => ({
    default: m.AdminQuarterlyReportsPage,
  })),
);
const AdminDeadLetterJobsPage = lazy(() =>
  import('@/features/admin/routes/AdminDeadLetterJobsPage').then((m) => ({
    default: m.AdminDeadLetterJobsPage,
  })),
);
const AdminLpFunnelPickerPage = lazy(() =>
  import('@/features/admin/routes/AdminLpFunnelPickerPage').then((m) => ({
    default: m.AdminLpFunnelPickerPage,
  })),
);
const AdminLpFunnelPage = lazy(() =>
  import('@/features/admin/routes/AdminLpFunnelPage').then((m) => ({
    default: m.AdminLpFunnelPage,
  })),
);
const AdminPartnerReferralPage = lazy(() =>
  import('@/features/admin/routes/AdminPartnerReferralPage').then((m) => ({
    default: m.AdminPartnerReferralPage,
  })),
);
const AdminInboundPitchesPage = lazy(() =>
  import('@/features/admin/routes/AdminInboundPitchesPage').then((m) => ({
    default: m.AdminInboundPitchesPage,
  })),
);
const AdminMISOverviewPage = lazy(() =>
  import('@/features/admin/routes/AdminMISOverviewPage').then((m) => ({
    default: m.AdminMISOverviewPage,
  })),
);
const AdminTracxnPage = lazy(() =>
  import('@/features/enrichment/routes/AdminTracxnPage').then((m) => ({
    default: m.AdminTracxnPage,
  })),
);
const AdminAppConfigPage = lazy(() =>
  import('@/features/admin/routes/AdminAppConfigPage').then((m) => ({
    default: m.AdminAppConfigPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import('@/features/admin/routes/AdminUsersPage').then((m) => ({
    default: m.AdminUsersPage,
  })),
);
const AdminStartupsPage = lazy(() =>
  import('@/features/admin/routes/AdminStartupsPage').then((m) => ({
    default: m.AdminStartupsPage,
  })),
);
const AdminAnalyticsPage = lazy(() =>
  import('@/features/analytics/routes/AdminAnalyticsPage').then((m) => ({
    default: m.AdminAnalyticsPage,
  })),
);
const DocumentsPage = lazy(() =>
  import('@/features/documents/routes/DocumentsPage').then((m) => ({
    default: m.DocumentsPage,
  })),
);
const MyDigestPage = lazy(() =>
  import('@/features/digest/routes/MyDigestPage').then((m) => ({
    default: m.MyDigestPage,
  })),
);
const PortfolioFundDeckPage = lazy(() =>
  import('@/features/funds/routes/PortfolioFundDeckPage').then((m) => ({
    default: m.PortfolioFundDeckPage,
  })),
);

export const router = createBrowserRouter(
  [
    { path: '/', element: <HomePage /> },
    { path: '/signin', element: <SignInPage /> },
    { path: '/expired', element: <ExpiredPage /> },
    { path: '/unauthorized', element: <UnauthorizedPage /> },
    {
      // Stage 6 S8 — public pitch submission form. OUTSIDE the auth shell
      // (no sidebar, no RoleGuard). Placed before RequireAuth so unauthenticated
      // visitors reach it without a redirect.
      path: '/pitch',
      element: (
        <Susp>
          <PublicPitchPage />
        </Susp>
      ),
    },
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
                  path: '/my-profile',
                  element: (
                    <Susp>
                      <MyProfilePage />
                    </Susp>
                  ),
                },
                {
                  // Partner is admitted with masked results (backend strips
                  // fields via _STARTUP_VISIBLE_FIELDS["partner"]). PRD §7.4.1.
                  // Profile-view shares the same searcher allowlist (§7.5.1).
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
                    {
                      // Detail page for search result cards. Uses
                      // /search/detail/startup|lp/:id endpoints directly —
                      // keeps Notion-migrated startups (no onboarded account)
                      // out of the existing /profile/:id flow.
                      path: '/search/profile/:id',
                      element: (
                        <Susp>
                          <SearchDetailPage />
                        </Susp>
                      ),
                    },
                    {
                      path: '/profile/:id',
                      element: (
                        <Susp>
                          <ProfilePage />
                        </Susp>
                      ),
                    },
                  ],
                },
                {
                  // PRD §7.3 — startup pitch editor, startup roles only.
                  // Moved to /my-pitch (Stage 6 S8) — /pitch is now the public
                  // submission landing page for unauthenticated founders.
                  element: (
                    <RoleGuard
                      roles={['startup_inprogress', 'startup_onboarded', 'startup_funded']}
                    />
                  ),
                  children: [
                    {
                      path: '/my-pitch',
                      element: (
                        <Susp>
                          <PitchPage />
                        </Susp>
                      ),
                    },
                  ],
                },
                {
                  // PRD §7.9 — MIS upload is startup_funded only.
                  // Admins review submissions at /admin/mis-overview (Stage 6 S3).
                  element: <RoleGuard roles={['startup_funded']} />,
                  children: [
                    {
                      path: '/mis',
                      element: (
                        <Susp>
                          <MISPage />
                        </Susp>
                      ),
                    },
                  ],
                },
                {
                  // PRD §7.10 — schedule is open to all authenticated users.
                  // ProfileGate already guards the parent subtree, so no extra
                  // RoleGuard is required here.
                  path: '/schedule',
                  element: (
                    <Susp>
                      <SchedulePage />
                    </Susp>
                  ),
                },
                {
                  // PRD §7.11 — travel is open to all authenticated users
                  // (matches NAV_ITEMS.travel.roles = ['*']).
                  path: '/travel',
                  element: (
                    <Susp>
                      <TravelPage />
                    </Susp>
                  ),
                },
                {
                  // PRD §7.8.5 — user-facing matchmaking. Roles match
                  // NAV_ITEMS.matchmaking.roles (no `partner`, no `advisor`,
                  // no startup_inprogress / startup_onboarded — they have no
                  // pitch profile yet so the LP-side won't generate matches).
                  element: (
                    <RoleGuard
                      roles={['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin']}
                    />
                  ),
                  children: [
                    {
                      path: '/matchmaking',
                      element: (
                        <Susp>
                          <MatchmakingPage />
                        </Susp>
                      ),
                    },
                  ],
                },
                {
                  // PRD §7.7.3 — "Who viewed me". Open to all authenticated
                  // users (matches NAV_ITEMS.viewers.roles = ['*']). PII rule
                  // §13 G11 enforced inside <ViewerCard>.
                  path: '/profile-viewers',
                  element: (
                    <Susp>
                      <ProfileViewersPage />
                    </Susp>
                  ),
                },
                {
                  // PRD §7.2.1 + §13.2 G2 — `/add-user` card-scan flow.
                  // Capability list matches CAPABILITIES['card_scan.use'] in
                  // role-capabilities.ts: LP / Potential LP / VC + admin.
                  element: (
                    <RoleGuard roles={['lp', 'potential_lp', 'vc', 'admin', 'super_admin']} />
                  ),
                  children: [
                    {
                      path: '/add-user',
                      element: (
                        <Susp>
                          <AddUserPage />
                        </Susp>
                      ),
                    },
                  ],
                },
                {
                  path: '/connections',
                  element: (
                    <Susp>
                      <ConnectionsPage />
                    </Susp>
                  ),
                },
                {
                  path: '/connections/pending',
                  element: (
                    <Susp>
                      <PendingConnectionsPage />
                    </Susp>
                  ),
                },
                {
                  // PRD §13 G3 — `/documents` is Phase-4 gated; this page
                  // renders the full UI shell with disabled actions + a
                  // backend-blockers summary card. Flip to a real list when
                  // POST /documents/upload + GET /documents land.
                  path: '/documents',
                  element: (
                    <Susp>
                      <DocumentsPage />
                    </Susp>
                  ),
                },
                {
                  // PRD §10.5 — user-facing digest preview is Phase-4 gated
                  // pending the WhatsApp/email channel + the three /me/digest
                  // endpoints. Admin digest workflows already work today
                  // under /admin/digest.
                  path: '/digest',
                  element: (
                    <Susp>
                      <MyDigestPage />
                    </Susp>
                  ),
                },
                {
                  element: <RoleGuard roles={['lp', 'potential_lp', 'admin', 'super_admin']} />,
                  children: [
                    {
                      path: '/portfolio-fund-deck',
                      element: (
                        <Susp>
                          <PortfolioFundDeckPage />
                        </Susp>
                      ),
                    },
                  ],
                },
                {
                  element: <RoleGuard roles={['admin', 'super_admin']} />,
                  children: [
                    {
                      path: '/admin',
                      element: (
                        <Susp>
                          <AdminHomePage />
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
                    {
                      path: '/admin/referrals',
                      element: (
                        <Susp>
                          <AdminReferralsPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.12.3 + §7.12.4 + §7.13.* — digest console.
                      path: '/admin/digest',
                      element: (
                        <Susp>
                          <AdminDigestPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.8.1–§7.8.4 — admin matchmaking ops.
                      path: '/admin/matchmaking',
                      element: (
                        <Susp>
                          <AdminMatchmakingOpsPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.12.7 + §7.12.8 — quarterly reports console.
                      path: '/admin/quarterly-reports',
                      element: (
                        <Susp>
                          <AdminQuarterlyReportsPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.12.9 + §7.12.10 — dead-letter queue. The
                      // ONLY endpoint that uses offset pagination (§13 G10).
                      path: '/admin/dead-letter-jobs',
                      element: (
                        <Susp>
                          <AdminDeadLetterJobsPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.12.5 — LP funnel. Picker + per-user detail.
                      path: '/admin/lp-funnel',
                      element: (
                        <Susp>
                          <AdminLpFunnelPickerPage />
                        </Susp>
                      ),
                    },
                    {
                      path: '/admin/lp-funnel/:user_id',
                      element: (
                        <Susp>
                          <AdminLpFunnelPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.12.6 — partner-referral broadcast.
                      path: '/admin/partner-referral',
                      element: (
                        <Susp>
                          <AdminPartnerReferralPage />
                        </Susp>
                      ),
                    },
                    {
                      // Phase 7.2.f — inbound pitches list + drawer.
                      path: '/admin/pitches/inbound',
                      element: (
                        <Susp>
                          <AdminInboundPitchesPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.15.1 — manual Tracxn ingest console.
                      path: '/admin/tracxn',
                      element: (
                        <Susp>
                          <AdminTracxnPage />
                        </Susp>
                      ),
                    },
                    {
                      // Runtime feature flags — admin-only dashboard settings.
                      path: '/admin/app-config',
                      element: (
                        <Susp>
                          <AdminAppConfigPage />
                        </Susp>
                      ),
                    },
                    {
                      // PRD §7.14 — analytics with 4 URL tabs.
                      path: '/admin/analytics',
                      element: (
                        <Susp>
                          <AdminAnalyticsPage />
                        </Susp>
                      ),
                    },
                    {
                      // Phase 7.2.g — MIS submissions overview.
                      path: '/admin/mis-overview',
                      element: (
                        <Susp>
                          <AdminMISOverviewPage />
                        </Susp>
                      ),
                    },
                    {
                      path: '/admin/users',
                      element: (
                        <Susp>
                          <AdminUsersPage />
                        </Susp>
                      ),
                    },
                    {
                      path: '/admin/startups',
                      element: (
                        <Susp>
                          <AdminStartupsPage />
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
