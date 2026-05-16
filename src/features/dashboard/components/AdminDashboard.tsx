import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  Inbox,
  Mail,
  Newspaper,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useAdminSummary } from '@/features/admin/hooks/use-admin-summary';
import { useQuarterlyReports } from '@/features/admin/hooks/use-quarterly-reports';

export function AdminDashboard() {
  const summary = useAdminSummary();
  const reports = useQuarterlyReports({ quarter: null });
  const recentReports = (reports.data ?? []).slice(0, 3);

  return (
    <div className="flex flex-col gap-6" data-testid="admin-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          KPIs and recent activity across the community. Refreshes when you tab back in.
        </p>
      </header>

      {summary.isLoading ? (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          data-testid="admin-summary-loading"
        >
          {Array.from({ length: 4 }).map((_, i) => (
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
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-ink-muted">
                  Pending connections
                </CardTitle>
                <Inbox className="h-4 w-4 text-ink-muted" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-ink-heading">
                  {summary.data.pending_connection_count}
                </p>
                <Link
                  to="/admin/connections?status=pending_admin"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  data-testid="kpi-pending-link"
                >
                  Review queue
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </CardContent>
            </Card>

            <Card data-testid="kpi-mis-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-ink-muted">
                  MIS — current month
                </CardTitle>
                <Users className="h-4 w-4 text-ink-muted" aria-hidden />
              </CardHeader>
              <CardContent>
                {summary.data.mis_status.length === 0 ? (
                  <p className="text-sm text-ink-muted">No portfolio companies yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {summary.data.mis_status.map((row) => (
                      <li
                        key={row.startup_id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate text-ink-heading">{row.company_name}</span>
                        {row.submitted ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-warning">
                            <XCircle className="h-3.5 w-3.5" aria-hidden />
                            Pending
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card data-testid="kpi-recent-digests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-ink-muted">
                  Recent digests
                </CardTitle>
                <Newspaper className="h-4 w-4 text-ink-muted" aria-hidden />
              </CardHeader>
              <CardContent>
                {summary.data.recent_digests.length === 0 ? (
                  <p className="text-sm text-ink-muted">No digests sent yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {summary.data.recent_digests.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{d.digest_type}</Badge>
                        <span
                          className="text-xs text-ink-muted"
                          title={format(parseISO(d.sent_at), 'PPpp')}
                        >
                          {formatDistanceToNow(parseISO(d.sent_at), { addSuffix: true })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/admin/digest"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  Manage digests
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Recent admin actions</CardTitle>
              <CardDescription>
                Last 10 actions by all admins. Audit-only — read across, not edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.data.recent_actions.length === 0 ? (
                <p className="text-sm text-ink-muted">No actions in the last window.</p>
              ) : (
                <ul className="flex flex-col gap-3" data-testid="admin-recent-actions">
                  {summary.data.recent_actions.map((a) => (
                    <li
                      key={`${a.admin_id}-${a.target_id}-${a.created_at}`}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 flex-none text-brand" aria-hidden />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="text-ink-heading">
                          <span className="font-semibold">{a.admin_name ?? 'Admin'}</span>{' '}
                          <span className="text-ink-muted">{a.action.replaceAll('_', ' ')}</span>{' '}
                          <span className="text-ink-muted">on</span>{' '}
                          <span>{a.target_type.replaceAll('_', ' ')}</span>
                        </p>
                        <p
                          className="text-xs text-ink-muted"
                          title={format(parseISO(a.created_at), 'PPpp')}
                        >
                          {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {recentReports.length > 0 ? (
            <Card data-testid="kpi-quarterly-reports">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm">Recent quarterly reports</CardTitle>
                  <CardDescription>
                    Latest 3 — click View report to open the Drive doc.
                  </CardDescription>
                </div>
                <FileCheck className="h-4 w-4 text-ink-muted" aria-hidden />
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {recentReports.map((r) => (
                    <li
                      key={r.report_id}
                      className="flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-ink-heading">{r.quarter}</span>
                        <span className="text-xs text-ink-muted">
                          {r.status === 'sent'
                            ? 'Sent'
                            : r.status === 'approved'
                              ? 'Approved, distributing…'
                              : 'Pending'}
                          {r.generated_at ? ` · ${format(parseISO(r.generated_at), 'PP')}` : ''}
                        </span>
                      </div>
                      {r.drive_url ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={r.drive_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            <span>View report</span>
                          </a>
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/admin/quarterly-reports"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  Manage quarterly reports
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Want to send a digest now?</CardTitle>
              <Mail className="h-4 w-4 text-ink-muted" aria-hidden />
            </CardHeader>
            <CardContent>
              <Link to="/admin/digest" className="text-sm font-medium text-brand hover:underline">
                Open the digest console →
              </Link>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
