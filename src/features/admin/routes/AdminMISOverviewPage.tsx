import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { useAdminMisOverview } from '@/features/admin/hooks/use-admin-mis-overview';
import type { MISOverviewItem, MISOverviewRange } from '@/features/admin/schemas';
import { MIS_OVERVIEW_RANGES } from '@/features/admin/schemas';
import { fmtDateTime } from '@/lib/date';
import { cn } from '@/lib/cn';

function ExternalLinkButton({
  href,
  label,
  testId,
}: {
  href: string;
  label: string;
  testId: string;
}) {
  return (
    <Button asChild size="sm" variant="outline" data-testid={testId}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
      </a>
    </Button>
  );
}

function fmt(value: number | null, prefix = '', suffix = ''): string {
  if (value === null) return '—';
  return `${prefix}${value.toLocaleString()}${suffix}`;
}

function CompanyLink({ userId, name }: { userId: string | null; name: string }) {
  if (!userId) return <span className="font-semibold text-ink-heading">{name}</span>;
  return (
    <Link to={`/search/profile/${userId}`} className="font-semibold text-brand hover:underline">
      {name}
    </Link>
  );
}

// Phase 7.2.g — admin MIS submissions overview.
export function AdminMISOverviewPage() {
  const [params, setParams] = useSearchParams();
  const rawRange = params.get('range');
  const range: MISOverviewRange =
    rawRange && (MIS_OVERVIEW_RANGES as readonly string[]).includes(rawRange)
      ? (rawRange as MISOverviewRange)
      : 'monthly';

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminMisOverview(range);

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  // Pending companies come from the first page only (same list regardless of pagination).
  const pending = data?.pages[0]?.pending ?? [];

  const setRange = (next: MISOverviewRange) => {
    const sp = new URLSearchParams(params);
    sp.set('range', next);
    setParams(sp, { replace: true });
  };

  const columns = useMemo<ColumnDef<MISOverviewItem>[]>(
    () => [
      {
        id: 'company_name',
        header: 'Company',
        cell: ({ row }) => (
          <CompanyLink userId={row.original.user_id ?? null} name={row.original.company_name} />
        ),
      },
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => <span className="text-sm text-ink-body">{row.original.period}</span>,
      },
      {
        id: 'submitted_at',
        header: 'Submitted',
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.submitted_at)}</span>
        ),
      },
      {
        id: 'file',
        header: 'File',
        cell: ({ row }) => {
          const { file_url, file_name, id } = row.original;
          if (!file_url) return <span className="text-xs text-ink-muted">—</span>;
          return (
            <ExternalLinkButton
              href={file_url}
              label={file_name ?? 'Open file'}
              testId={`file-${id}`}
            />
          );
        },
      },
      {
        id: 'revenue',
        header: 'Revenue',
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">{fmt(row.original.revenue, '₹')}</span>
        ),
      },
      {
        id: 'burn',
        header: 'Burn',
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">{fmt(row.original.burn, '₹')}</span>
        ),
      },
      {
        id: 'runway_months',
        header: 'Runway',
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">
            {row.original.runway_months !== null ? `${row.original.runway_months} mo` : '—'}
          </span>
        ),
      },
      {
        id: 'headcount',
        header: 'Headcount',
        cell: ({ row }) => (
          <span className="text-sm text-ink-body">{fmt(row.original.headcount)}</span>
        ),
      },
      {
        id: 'comment',
        header: 'Comment',
        cell: ({ row }) => (
          <span className="max-w-xs truncate text-sm text-ink-body">
            {row.original.comment ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const { notion_page_id, drive_folder_id, id } = row.original;
          const hasActions = notion_page_id || drive_folder_id;
          if (!hasActions) return <span className="text-xs text-ink-muted">—</span>;
          return (
            <div className="flex flex-wrap gap-2">
              {drive_folder_id ? (
                <ExternalLinkButton
                  href={`https://drive.google.com/drive/folders/${drive_folder_id}`}
                  label="Open Drive"
                  testId={`drive-${id}`}
                />
              ) : null}
              {notion_page_id ? (
                <ExternalLinkButton
                  href={`https://notion.so/${notion_page_id}`}
                  label="Open Notion"
                  testId={`notion-${id}`}
                />
              ) : null}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">MIS overview</h1>
        <p className="text-sm text-ink-muted">
          Monthly investment summary — pending and submitted across all funded startups.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Range filter">
        {MIS_OVERVIEW_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'min-h-9 rounded-full border px-4 py-1 text-sm font-medium capitalize transition-colors',
              r === range
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
            )}
            aria-pressed={r === range}
            data-testid={`range-${r}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── Pending this month ─────────────────────────────────────────────── */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-warning">
              <Clock className="h-4 w-4" aria-hidden />
              Pending this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2" data-testid="mis-pending-loading">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : pending.length > 0 ? (
        <Card data-testid="mis-pending-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-warning">
              <Clock className="h-4 w-4" aria-hidden />
              Pending this month
              <span className="ml-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                {pending.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {pending.map((p) => (
                <li key={p.startup_id} className="flex items-center gap-3 py-2">
                  <Clock className="h-3.5 w-3.5 flex-none text-warning" aria-hidden />
                  <CompanyLink userId={p.user_id ?? null} name={p.company_name} />
                  <span className="ml-auto text-xs text-warning">No submission</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : !isError ? (
        <Card>
          <CardContent className="py-4">
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              All portfolio companies have submitted for this month.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Submissions within range ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Submissions <span className="font-normal text-ink-muted capitalize">({range})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3" data-testid="mis-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              error={error}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={items}
                getRowId={(r) => r.id}
                emptyState={
                  <EmptyState
                    icon={BarChart3}
                    title="No MIS submissions in this range"
                    description="Funded startups submit their monthly investment summary here."
                  />
                }
              />
              {hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    data-testid="load-more"
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
