import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { useQuarterlyReports } from '@/features/admin/hooks/use-quarterly-reports';
import { QuarterlyReportApproveDialog } from '@/features/admin/components/QuarterlyReportApproveDialog';
import type { QuarterlyReport, QuarterlyReportStatus } from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';

function statusVariant(status: QuarterlyReportStatus): 'default' | 'success' | 'secondary' {
  if (status === 'sent') return 'success';
  if (status === 'approved') return 'default';
  return 'secondary';
}

function statusLabel(report: QuarterlyReport): string {
  if (report.status === 'sent') return 'Sent';
  if (report.status === 'approved') return 'Approved, distributing…';
  return 'Pending';
}

// PRD §7.12.7 + §7.12.8 — admin quarterly reports console.
export function AdminQuarterlyReportsPage() {
  const [params, setParams] = useSearchParams();
  const quarterFilter = params.get('quarter');
  const list = useQuarterlyReports({ quarter: quarterFilter });
  const [approving, setApproving] = useState<QuarterlyReport | null>(null);

  const setQuarter = (next: string) => {
    const sp = new URLSearchParams(params);
    if (next.trim()) sp.set('quarter', next.trim());
    else sp.delete('quarter');
    setParams(sp, { replace: true });
  };

  const items = list.data ?? [];

  const columns = useMemo<ColumnDef<QuarterlyReport>[]>(
    () => [
      {
        id: 'quarter',
        header: 'Quarter',
        cell: ({ row }) => (
          <span className="font-semibold text-ink-heading">{row.original.quarter}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{statusLabel(row.original)}</Badge>
        ),
      },
      {
        id: 'drive_url',
        header: 'Drive link',
        cell: ({ row }) =>
          row.original.drive_url ? (
            <a
              className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              href={row.original.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`drive-link-${row.original.report_id}`}
            >
              Open
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          ),
      },
      {
        id: 'generated_at',
        header: 'Generated',
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.generated_at)}</span>
        ),
      },
      {
        id: 'recipient_count',
        header: 'Recipients',
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">{row.original.recipient_count ?? '—'}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.status !== 'pending') {
            return <span className="text-xs text-ink-muted">—</span>;
          }
          return (
            <Button
              size="sm"
              onClick={() => setApproving(row.original)}
              data-testid={`approve-${row.original.report_id}`}
            >
              Approve
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Quarterly reports</h1>
        <p className="text-sm text-ink-muted">
          Review generated quarterly artefacts and approve them for LP distribution.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Filter by quarter (e.g. Q1-2026). Leave blank to show all.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="qr-quarter">Quarter</Label>
              <Input
                id="qr-quarter"
                placeholder="Q1-2026"
                defaultValue={quarterFilter ?? ''}
                className="w-40"
                onBlur={(e) => setQuarter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setQuarter((e.target as HTMLInputElement).value);
                  }
                }}
                data-testid="qr-quarter-input"
              />
            </div>
            {quarterFilter ? (
              <Button variant="ghost" size="sm" onClick={() => setQuarter('')}>
                Clear filter
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="qr-loading">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState
              error={list.error}
              onRetry={() => {
                void list.refetch();
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={items}
              getRowId={(r) => r.report_id}
              emptyState={
                <EmptyState
                  title="No reports"
                  description={
                    quarterFilter
                      ? `No reports for ${quarterFilter}.`
                      : 'No quarterly reports have been generated yet.'
                  }
                />
              }
            />
          )}
        </CardContent>
      </Card>

      <QuarterlyReportApproveDialog report={approving} onClose={() => setApproving(null)} />
    </div>
  );
}
