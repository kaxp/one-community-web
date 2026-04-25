import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useAnalyticsOverview } from '@/features/analytics/hooks/use-analytics-overview';
import { useAnalyticsFunnelLp } from '@/features/analytics/hooks/use-analytics-funnel-lp';
import { useAnalyticsFunnelStartup } from '@/features/analytics/hooks/use-analytics-funnel-startup';
import { useAnalyticsFunnelConnections } from '@/features/analytics/hooks/use-analytics-funnel-connections';
import { useAnalyticsCohort } from '@/features/analytics/hooks/use-analytics-cohort';
import { useAnalyticsMatchSuccess } from '@/features/analytics/hooks/use-analytics-match-success';
import { KpiCards } from '@/features/analytics/components/KpiCards';
import { FunnelBarChart } from '@/features/analytics/components/FunnelBarChart';
import { CohortHeatmap } from '@/features/analytics/components/CohortHeatmap';
import { MatchSuccessChart } from '@/features/analytics/components/MatchSuccessChart';
import {
  CONNECTIONS_FUNNEL_LABEL,
  LP_FUNNEL_LABEL,
  startupPipelineLabel,
  connectionsFunnelLabel,
} from '@/features/analytics/lib/labels';
import { LP_FUNNEL_STATUSES, type LPFunnelStatus } from '@/features/admin/schemas';
import { cn } from '@/lib/cn';

const TABS = ['overview', 'funnel', 'cohort', 'match'] as const;
type AnalyticsTab = (typeof TABS)[number];

const TAB_LABEL: Record<AnalyticsTab, string> = {
  overview: 'Overview',
  funnel: 'Funnel',
  cohort: 'Cohort',
  match: 'Match Success',
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
        <MatchSuccessChart data={series} />
      </CardContent>
    </Card>
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
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Analytics</h1>
        <p className="text-sm text-ink-muted">
          KPIs, funnels, cohort retention, and matchmaking effectiveness.
        </p>
      </header>

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
    </div>
  );
}
