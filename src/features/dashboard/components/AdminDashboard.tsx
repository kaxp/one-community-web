import { Link } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ArrowRight, CheckCircle2, Inbox, Newspaper, Users, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useAdminSummary } from '@/features/admin/hooks/use-admin-summary';

function KPICard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-ink-muted">{title}</CardTitle>
        <Icon className="h-4 w-4 text-ink-muted" aria-hidden />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const summary = useAdminSummary();

  return (
    <div className="flex flex-col gap-6" data-testid="admin-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">Community KPIs at a glance.</p>
      </header>

      {summary.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="admin-dash-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : summary.isError ? (
        <ErrorState
          error={summary.error}
          onRetry={() => {
            void summary.refetch();
          }}
        />
      ) : summary.data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KPICard title="Pending connections" icon={Inbox}>
            <p className="text-3xl font-semibold text-ink-heading">
              {summary.data.pending_connection_count}
            </p>
            <Link
              to="/admin/connections?status=pending_admin"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              data-testid="admin-dash-connections-link"
            >
              Review queue <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </KPICard>

          <KPICard title="MIS — current month" icon={Users}>
            {summary.data.mis_status.length === 0 ? (
              <p className="text-sm text-ink-muted">No portfolio companies yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {summary.data.mis_status.slice(0, 4).map((row) => (
                  <li
                    key={row.startup_id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate text-ink-heading">{row.company_name}</span>
                    {row.submitted ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <XCircle className="h-3 w-3" aria-hidden /> Due
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/admin/mis-overview"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              MIS overview <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </KPICard>

          <KPICard title="Recent digests" icon={Newspaper}>
            {summary.data.recent_digests.length === 0 ? (
              <p className="text-sm text-ink-muted">No digests sent yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.data.recent_digests.slice(0, 3).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <Badge variant="secondary">{d.digest_type}</Badge>
                    <span className="text-xs text-ink-muted">
                      {formatDistanceToNow(parseISO(d.sent_at), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/admin/digest"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Manage digests <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </KPICard>
        </div>
      ) : null}
    </div>
  );
}
