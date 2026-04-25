import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { InlineExecutionButton } from '@/components/execution-panel';
import { OffsetPaginator } from '@/components/pagination/OffsetPaginator';
import { useDeadLetterJobs } from '@/features/admin/hooks/use-dead-letter-jobs';
import { useDeadLetterRetry } from '@/features/admin/hooks/use-dead-letter-retry';
import { DlqDetailDrawer } from '@/features/admin/components/DlqDetailDrawer';
import {
  DLQ_RETRY_STATUSES,
  type DeadLetterJob,
  type DLQRetryStatus,
} from '@/features/admin/schemas';
import { cn } from '@/lib/cn';
import type { ApiError } from '@/api/errors';

const TAB_LABEL: Record<DLQRetryStatus, string> = {
  pending: 'Pending',
  retried: 'Retried',
  succeeded: 'Succeeded',
  abandoned: 'Abandoned',
};

const DEFAULT_LIMIT = 50;

function isStatus(value: string | null): value is DLQRetryStatus {
  return (DLQ_RETRY_STATUSES as readonly string[]).includes(value ?? '');
}

// PRD §7.12.9 + §7.12.10 — admin Dead-Letter Queue console. URL tabs per
// `retry_status`, OFFSET-paginated DataTable (the only such endpoint —
// §13 G10), per-row "Retry" InlineExecutionButton (pending tab only), and
// a side drawer with full traceback + args/kwargs.
export function AdminDeadLetterJobsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('retry_status');
  const status: DLQRetryStatus = isStatus(tabParam) ? tabParam : 'pending';
  const offset = Math.max(0, Number.parseInt(params.get('offset') ?? '0', 10) || 0);

  const list = useDeadLetterJobs({
    retry_status: status,
    limit: DEFAULT_LIMIT,
    offset,
  });
  const retry = useDeadLetterRetry();
  const [picked, setPicked] = useState<DeadLetterJob | null>(null);

  const setTab = (next: DLQRetryStatus) => {
    const sp = new URLSearchParams(params);
    sp.set('retry_status', next);
    sp.delete('offset');
    setParams(sp, { replace: true });
  };

  const setOffset = (next: number) => {
    const sp = new URLSearchParams(params);
    if (next === 0) sp.delete('offset');
    else sp.set('offset', String(next));
    setParams(sp, { replace: true });
  };

  const items = list.data?.items ?? [];

  const errorToast = (err: ApiError) => {
    if (err.code === 'conflict') return 'Already moved — refreshing';
    if (err.code === 'not_found') return 'Job no longer in queue';
    return err.userMessage;
  };

  const columns = useMemo<ColumnDef<DeadLetterJob>[]>(
    () => [
      {
        id: 'task_name',
        header: 'Task',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left font-medium text-ink-heading hover:underline"
            onClick={() => setPicked(row.original)}
            data-testid={`dlq-row-${row.original.id}`}
          >
            {row.original.task_name}
          </button>
        ),
      },
      {
        id: 'exception_class',
        header: 'Exception',
        cell: ({ row }) => <Badge variant="error">{row.original.exception_class}</Badge>,
      },
      {
        id: 'failed_at',
        header: 'Failed',
        cell: ({ row }) => (
          <span
            className="text-xs text-ink-muted"
            title={format(parseISO(row.original.failed_at), 'PPpp')}
          >
            {formatDistanceToNow(parseISO(row.original.failed_at), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: 'retry_status',
        header: 'Retry',
        cell: ({ row }) => <Badge variant="outline">{row.original.retry_status}</Badge>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.retry_status !== 'pending') {
            return <span className="text-xs text-ink-muted">—</span>;
          }
          return (
            <InlineExecutionButton
              size="sm"
              mutation={retry}
              input={{ id: row.original.id }}
              onSuccessToast={(data) => `Retried — new task ${data.new_task_id}`}
              onErrorToast={errorToast}
              data-testid={`retry-${row.original.id}`}
            >
              Retry
            </InlineExecutionButton>
          );
        },
      },
    ],
    [retry],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dead-letter jobs</h1>
        <p className="text-sm text-ink-muted">
          Failed Celery tasks. Retry pending rows or inspect tracebacks for triage.
        </p>
      </header>

      <nav role="tablist" aria-label="Retry status" className="flex flex-wrap gap-2">
        {DLQ_RETRY_STATUSES.map((s) => {
          const isActive = s === status;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setTab(s)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
              )}
              data-testid={`dlq-tab-${s}`}
            >
              {TAB_LABEL[s]}
            </button>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{TAB_LABEL[status]}</CardTitle>
          <CardDescription>
            Offset pagination — page size {DEFAULT_LIMIT}. Click a task row to inspect the traceback
            + args.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {list.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="dlq-loading">
              {Array.from({ length: 6 }).map((_, i) => (
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
          ) : items.length === 0 ? (
            <EmptyState
              title={`No ${status} jobs`}
              description="Either none have failed in this state, or you're past the last page."
              action={
                offset > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
                    Back to page 1
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <DataTable columns={columns} data={items} getRowId={(r) => r.id} />
              <OffsetPaginator
                limit={DEFAULT_LIMIT}
                offset={offset}
                itemCount={items.length}
                onChange={({ offset: next }) => setOffset(next)}
              />
            </>
          )}
        </CardContent>
      </Card>

      <DlqDetailDrawer row={picked} onClose={() => setPicked(null)} />
    </div>
  );
}
