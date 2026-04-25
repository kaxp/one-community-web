import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { DataTable } from '@/components/data-table/DataTable';
import { InlineExecutionButton } from '@/components/execution-panel';
import { RoleBadge } from '@/components/role-badge';
import { useAdminConnections } from '@/features/admin/hooks/use-admin-connections';
import { useAdminConnectionAction } from '@/features/admin/hooks/use-admin-connection-action';
import {
  ADMIN_TAB_STATUSES,
  type AdminConnection,
  type AdminConnectionStatus,
  type AdminTabStatus,
} from '@/features/admin/schemas';
import { STATUS_LABEL, TAB_LABEL, statusBadgeVariant } from '@/features/admin/lib/status-labels';
import { fmtDateTime } from '@/lib/date';
import { qk } from '@/api/query-keys';
import { cn } from '@/lib/cn';

const DEFAULT_TAB: AdminTabStatus = 'pending_admin';

function isAdminTabStatus(value: string | null): value is AdminTabStatus {
  return (ADMIN_TAB_STATUSES as readonly string[]).includes(value ?? '');
}

export function AdminConnectionsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('status');
  const tab: AdminTabStatus = isAdminTabStatus(tabParam) ? tabParam : DEFAULT_TAB;

  const setTab = (next: AdminTabStatus) => {
    const sp = new URLSearchParams(params);
    sp.set('status', next);
    setParams(sp, { replace: true });
  };

  const list = useAdminConnections({ status: tab });
  const action = useAdminConnectionAction();
  const qc = useQueryClient();

  const items = useMemo(
    () => (list.data?.pages ?? []).flatMap((page) => page.items),
    [list.data?.pages],
  );

  const columns = useMemo<ColumnDef<AdminConnection>[]>(
    () => [
      {
        id: 'requester',
        header: 'Requester',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-ink-heading">{row.original.requester.name}</span>
            <span className="text-xs text-ink-muted">
              {row.original.requester.organisation ?? '—'}
            </span>
            <RoleBadge role={row.original.requester.role} className="self-start" />
          </div>
        ),
      },
      {
        id: 'target',
        header: 'Target',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-ink-heading">{row.original.target.name}</span>
            <span className="text-xs text-ink-muted">
              {row.original.target.organisation ?? '—'}
            </span>
            <RoleBadge role={row.original.target.role} className="self-start" />
          </div>
        ),
      },
      {
        id: 'message',
        header: 'Message',
        cell: ({ row }) => (
          <p className="max-w-xs whitespace-pre-wrap text-sm text-ink-body line-clamp-3">
            {row.original.message ?? <span className="italic text-ink-muted">No message</span>}
          </p>
        ),
      },
      {
        id: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">{fmtDateTime(row.original.created_at)}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.status !== 'pending_admin') {
            return <span className="text-xs text-ink-muted">—</span>;
          }
          const conn_id = row.original.connection_id;
          return (
            <div className="flex flex-wrap items-center gap-2">
              <InlineExecutionButton
                size="sm"
                mutation={action}
                input={{
                  connection_id: conn_id,
                  current_status: 'pending_admin' as AdminConnectionStatus,
                  action: 'approve' as const,
                }}
                onSuccessToast={() => 'Approved'}
                onErrorToast={(err) =>
                  err.code === 'conflict' ? 'Already handled — refreshing' : err.userMessage
                }
              >
                Approve
              </InlineExecutionButton>
              <InlineExecutionButton
                variant="outline"
                size="sm"
                mutation={action}
                input={{
                  connection_id: conn_id,
                  current_status: 'pending_admin' as AdminConnectionStatus,
                  action: 'reject' as const,
                }}
                onSuccessToast={() => 'Rejected'}
                onErrorToast={(err) =>
                  err.code === 'conflict' ? 'Already handled — refreshing' : err.userMessage
                }
              >
                Reject
              </InlineExecutionButton>
            </div>
          );
        },
      },
    ],
    [action],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Connection queue</h1>
        <p className="text-sm text-ink-muted">
          Review and act on connection requests across the community.
        </p>
      </div>

      <nav role="tablist" aria-label="Connection status" className="flex flex-wrap gap-2">
        {ADMIN_TAB_STATUSES.map((s) => {
          const isActive = s === tab;
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
              data-testid={`tab-${s}`}
            >
              {TAB_LABEL[s]}
            </button>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{TAB_LABEL[tab]}</CardTitle>
          <CardDescription>
            {tab === 'pending_admin'
              ? 'New requests waiting for admin review.'
              : tab === 'pending_target'
                ? 'Approved by admin, awaiting the target user’s response.'
                : tab === 'accepted'
                  ? 'Connections both sides have accepted.'
                  : 'Requests the target declined or admin rejected.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="admin-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
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
              getRowId={(row) => row.connection_id}
              emptyState={
                <EmptyState
                  title="No requests in this tab"
                  description="When new requests come in, they’ll appear here."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void qc.invalidateQueries({ queryKey: qk.admin.connections.all })
                      }
                    >
                      Refresh
                    </Button>
                  }
                />
              }
            />
          )}
          {list.hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                disabled={list.isFetchingNextPage}
                onClick={() => list.fetchNextPage()}
              >
                {list.isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Loading…</span>
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
