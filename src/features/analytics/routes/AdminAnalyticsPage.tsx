import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useAnalyticsOverview } from '@/features/analytics/hooks/use-analytics-overview';
import { useAnalyticsFunnelLp } from '@/features/analytics/hooks/use-analytics-funnel-lp';
import { useAnalyticsFunnelStartup } from '@/features/analytics/hooks/use-analytics-funnel-startup';
import { useAnalyticsFunnelConnections } from '@/features/analytics/hooks/use-analytics-funnel-connections';
import { useAnalyticsCohort } from '@/features/analytics/hooks/use-analytics-cohort';
import { useAnalyticsMatchSuccess } from '@/features/analytics/hooks/use-analytics-match-success';
import {
  useAnalyticsUserActivities,
  useAnalyticsUserLoginHistory,
  useAnalyticsUserSearchHistory,
} from '@/features/analytics/hooks/use-analytics-user-activities';
import { KpiCards } from '@/features/analytics/components/KpiCards';
import { CohortHeatmap } from '@/features/analytics/components/CohortHeatmap';
import type { UserActivityItem } from '@/features/analytics/schemas';

// issues.md [I-9] / [I-1] — Recharts ships ~120 KB gzip via FunnelBarChart +
// MatchSuccessChart. Lazy-load both so the analytics chunk loads only the
// hooks + KpiCards + CohortHeatmap shell on Overview entry; Recharts is
// fetched on the first Funnel / Match tab click. KpiCards and CohortHeatmap
// stay eager because they don't pull Recharts.
const FunnelBarChart = lazy(() =>
  import('@/features/analytics/components/FunnelBarChart').then((m) => ({
    default: m.FunnelBarChart,
  })),
);
const MatchSuccessChart = lazy(() =>
  import('@/features/analytics/components/MatchSuccessChart').then((m) => ({
    default: m.MatchSuccessChart,
  })),
);

function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? 'h-60 w-full'} />;
}
import {
  CONNECTIONS_FUNNEL_LABEL,
  LP_FUNNEL_LABEL,
  startupPipelineLabel,
  connectionsFunnelLabel,
} from '@/features/analytics/lib/labels';
import { LP_FUNNEL_STATUSES, type LPFunnelStatus } from '@/features/admin/schemas';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';

const TABS = ['overview', 'funnel', 'cohort', 'match', 'activities'] as const;
type AnalyticsTab = (typeof TABS)[number];

const TAB_LABEL: Record<AnalyticsTab, string> = {
  overview: 'Overview',
  funnel: 'Funnel',
  cohort: 'Cohort',
  match: 'Match Success',
  activities: 'User Activities',
};

function isTab(value: string | null): value is AnalyticsTab {
  return (TABS as readonly string[]).includes(value ?? '');
}

function OverviewPane() {
  const overview = useAnalyticsOverview();
  if (overview.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (overview.isError) {
    return (
      <ErrorState
        error={overview.error}
        onRetry={() => {
          void overview.refetch();
        }}
      />
    );
  }
  if (!overview.data) return null;
  return <KpiCards overview={overview.data} />;
}

function FunnelPane() {
  const lp = useAnalyticsFunnelLp();
  const startup = useAnalyticsFunnelStartup();
  const conn = useAnalyticsFunnelConnections();

  // Build LP series — guarantee all 5 stages present in canonical order.
  const lpSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of lp.data?.items ?? []) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + (item.count ?? 0));
    }
    return LP_FUNNEL_STATUSES.map((s) => ({
      label: LP_FUNNEL_LABEL[s as LPFunnelStatus],
      count: counts.get(s) ?? 0,
    }));
  }, [lp.data]);

  // Build startup series — top-6 by count + collapsed "Other" bucket.
  const startupSeries = useMemo(() => {
    const items = (startup.data?.items ?? []).slice().sort((a, b) => b.count - a.count);
    const top = items.slice(0, 6);
    const rest = items.slice(6);
    const other = rest.reduce((acc, r) => acc + (r.count ?? 0), 0);
    const series = top.map((r) => ({
      label: startupPipelineLabel(r.status),
      count: r.count ?? 0,
    }));
    if (other > 0) series.push({ label: 'Other', count: other });
    return series;
  }, [startup.data]);

  // Connections — render every documented status (5 stages).
  const connSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of conn.data?.items ?? []) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + (item.count ?? 0));
    }
    return Object.keys(CONNECTIONS_FUNNEL_LABEL).map((s) => ({
      label: connectionsFunnelLabel(s),
      count: counts.get(s) ?? 0,
    }));
  }, [conn.data]);

  return (
    <Suspense fallback={<ChartSkeleton className="h-60 w-full" />}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LP funnel</CardTitle>
            <CardDescription>Counts per stage (1_new_lead → 5_invested).</CardDescription>
          </CardHeader>
          <CardContent>
            {lp.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : lp.isError ? (
              <ErrorState
                error={lp.error}
                onRetry={() => {
                  void lp.refetch();
                }}
              />
            ) : (
              <FunnelBarChart data={lpSeries} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Startup pipeline</CardTitle>
            <CardDescription>Top 6 statuses; everything else folded into Other.</CardDescription>
          </CardHeader>
          <CardContent>
            {startup.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : startup.isError ? (
              <ErrorState
                error={startup.error}
                onRetry={() => {
                  void startup.refetch();
                }}
              />
            ) : (
              <FunnelBarChart data={startupSeries} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Connection requests</CardTitle>
            <CardDescription>Pipeline counts by `conn_status`.</CardDescription>
          </CardHeader>
          <CardContent>
            {conn.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : conn.isError ? (
              <ErrorState
                error={conn.error}
                onRetry={() => {
                  void conn.refetch();
                }}
              />
            ) : (
              <FunnelBarChart data={connSeries} />
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}

function CohortPane() {
  const cohort = useAnalyticsCohort({ months: 12 });
  if (cohort.isLoading) {
    return <Skeleton className="h-60 w-full" />;
  }
  if (cohort.isError) {
    return (
      <ErrorState
        error={cohort.error}
        onRetry={() => {
          void cohort.refetch();
        }}
      />
    );
  }
  const rows = cohort.data?.items ?? [];
  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">No cohort data available.</p>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly cohort retention</CardTitle>
        <CardDescription>
          Each cell shows the percentage of the cohort that remained engaged at the corresponding
          window. — means not enough time has elapsed yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CohortHeatmap rows={rows} />
      </CardContent>
    </Card>
  );
}

function MatchPane() {
  const ms = useAnalyticsMatchSuccess();
  if (ms.isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }
  if (ms.isError) {
    return (
      <ErrorState
        error={ms.error}
        onRetry={() => {
          void ms.refetch();
        }}
      />
    );
  }
  const items = (ms.data?.items ?? []).slice().sort((a, b) => a.week_of.localeCompare(b.week_of));
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">No match-success data yet.</p>;
  }
  const series = items.map((d) => ({
    week_of: d.week_of,
    accepted: d.accepted_pct ?? 0,
    rejected: d.rejected_pct ?? 0,
    skipped: d.skipped_pct ?? 0,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly match success</CardTitle>
        <CardDescription>
          Suggestion outcomes per week — accepted / rejected / skipped percentages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<ChartSkeleton className="h-72 w-full" />}>
          <MatchSuccessChart data={series} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function roleBadgeVariant(role: string): 'success' | 'warning' | 'secondary' {
  if (role === 'lp' || role === 'potential_lp') return 'success';
  if (role === 'admin' || role === 'super_admin') return 'warning';
  return 'secondary';
}

function UserActivityDrawer({
  user,
  open,
  onClose,
}: {
  user: UserActivityItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const userId = open ? (user?.id ?? null) : null;
  const searches = useAnalyticsUserSearchHistory(userId);
  const logins = useAnalyticsUserLoginHistory(userId);
  const searchItems = searches.data?.items ?? [];
  const loginItems = logins.data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full max-w-lg flex-col overflow-hidden p-0">
        <SheetTitle className="sr-only">Activity for {user?.name ?? 'user'}</SheetTitle>
        <SheetDescription className="sr-only">
          Login and search history for this user
        </SheetDescription>

        {/* ── Header ── */}
        <div className="border-b border-border bg-surface-secondary px-6 py-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand">
              {(user?.name ?? '?')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-heading">{user?.name ?? 'Unknown'}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email ?? ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={roleBadgeVariant(user?.role ?? '')}>{user?.role ?? ''}</Badge>
            <span className="text-xs text-ink-muted">
              {user?.total_logins ?? 0} login
              {(user?.total_logins ?? 0) !== 1 ? 's' : ''} · {user?.total_searches ?? 0} search
              {(user?.total_searches ?? 0) !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="logins" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 self-start">
            <TabsTrigger value="logins">Login History</TabsTrigger>
            <TabsTrigger value="searches">Search History</TabsTrigger>
          </TabsList>

          <TabsContent value="logins" className="flex-1 overflow-y-auto px-4 py-4">
            {logins.isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : logins.isError ? (
              <ErrorState error={logins.error} onRetry={() => void logins.refetch()} />
            ) : loginItems.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-ink-heading">No logins yet</p>
                <p className="text-xs text-ink-muted">
                  This user has not signed in since login tracking started.
                </p>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {loginItems.map((entry, idx) => (
                  <li key={entry.id}>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-secondary">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug text-ink-heading">
                          {format(parseISO(entry.login_at), 'dd MMM yyyy · HH:mm')}
                        </p>
                        <span className="shrink-0 text-xs text-ink-muted">#{idx + 1}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                        {entry.ip_address && <span>IP {entry.ip_address}</span>}
                        {entry.user_agent && (
                          <span className="break-words min-w-0" title={entry.user_agent}>
                            {entry.user_agent}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="searches" className="flex-1 overflow-y-auto px-4 py-4">
            {searches.isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : searches.isError ? (
              <ErrorState error={searches.error} onRetry={() => void searches.refetch()} />
            ) : searchItems.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-ink-heading">No searches yet</p>
                <p className="text-xs text-ink-muted">This user has not performed any searches.</p>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {searchItems.map((entry, idx) => (
                  <li key={entry.id}>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 transition-colors hover:bg-surface-secondary">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug text-ink-heading">{entry.query}</p>
                        <span className="shrink-0 text-xs text-ink-muted">#{idx + 1}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                        <span className="flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                          {entry.results_count} result{entry.results_count !== 1 ? 's' : ''}
                        </span>
                        {entry.duration_ms != null && <span>{entry.duration_ms} ms</span>}
                        <span>{format(parseISO(entry.created_at), 'dd MMM yyyy · HH:mm')}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function UserActivitiesPane() {
  const [selectedUser, setSelectedUser] = useState<UserActivityItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const list = useAnalyticsUserActivities({ limit: 100 });
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  function handleOpen(user: UserActivityItem) {
    setSelectedUser(user);
    setDrawerOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Activities</CardTitle>
          <CardDescription>
            {total} users on the platform. Click any row to see their login + search history.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="flex flex-col gap-px p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-16 w-full rounded-none first:rounded-t-xl last:rounded-b-xl"
                />
              ))}
            </div>
          ) : list.isError ? (
            <div className="p-6">
              <ErrorState error={list.error} onRetry={() => void list.refetch()} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No users yet" description="No one has accessed the platform." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-right">Logins</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-right">Searches</th>
                    <th className="px-4 py-3 text-left">Last Search</th>
                    <th className="px-6 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-surface-secondary"
                      onClick={() => handleOpen(user)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-ink-heading">{user.name ?? '—'}</p>
                        {user.email && (
                          <p className="mt-0.5 text-xs text-ink-muted">{user.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center gap-1 font-semibold text-ink-heading">
                          {user.total_logins > 0 && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                          )}
                          {user.total_logins}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-ink-muted">
                        {user.last_login_at
                          ? format(parseISO(user.last_login_at), 'dd MMM yyyy · HH:mm')
                          : '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center gap-1 font-semibold text-ink-heading">
                          {user.total_searches > 0 && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                          )}
                          {user.total_searches}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-ink-muted">
                        {user.last_search_at
                          ? format(parseISO(user.last_search_at), 'dd MMM yyyy')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="outline" tabIndex={-1}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserActivityDrawer
        user={selectedUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

// PRD §7.14 — admin analytics console with four URL-backed tabs:
// Overview / Funnel / Cohort / Match Success.
export function AdminAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: AnalyticsTab = isTab(tabParam) ? tabParam : 'overview';

  const setTab = (next: AnalyticsTab) => {
    const sp = new URLSearchParams(params);
    sp.set('tab', next);
    setParams(sp, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        subtitle="KPIs, funnels, cohort retention, and matchmaking effectiveness."
      />

      <nav role="tablist" aria-label="Analytics section" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
              )}
              data-testid={`analytics-tab-${t}`}
            >
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' ? <OverviewPane /> : null}
      {tab === 'funnel' ? <FunnelPane /> : null}
      {tab === 'cohort' ? <CohortPane /> : null}
      {tab === 'match' ? <MatchPane /> : null}
      {tab === 'activities' ? <UserActivitiesPane /> : null}
    </div>
  );
}
