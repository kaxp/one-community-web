import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  type AdminConnectionParty,
  type AdminConnectionStatus,
  type AdminTabStatus,
} from '@/features/admin/schemas';
import { STATUS_LABEL, TAB_LABEL, statusBadgeVariant } from '@/features/admin/lib/status-labels';
import { fmtDateTime } from '@/lib/date';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';

const DEFAULT_TAB: AdminTabStatus = 'pending_admin';

function isAdminTabStatus(value: string | null): value is AdminTabStatus {
  return (ADMIN_TAB_STATUSES as readonly string[]).includes(value ?? '');
}

function isStartupRole(role: AdminConnectionParty['role']): boolean {
  return role === 'startup_inprogress' || role === 'startup_onboarded' || role === 'startup_funded';
}

// For startup parties prefer company_name as the headline; for others use name.
function partyPrimary(p: AdminConnectionParty): string {
  if (isStartupRole(p.role)) return p.company_name ?? p.name ?? '—';
  return p.name ?? '—';
}

// Secondary sub-label: for startups show founder name when company_name is primary;
// for others show organisation.
function partySecondary(p: AdminConnectionParty): string | null {
  if (isStartupRole(p.role)) return p.company_name ? (p.name ?? null) : null;
  return p.organisation ?? null;
}

// One <RowActions> instance per row, so each row has its own mutation state and
// reject-dialog state. Concurrent clicks across rows don't share isPending.
function RowActions({ connectionId }: { connectionId: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');
  const action = useAdminConnectionAction();

  const errorToast = (err: ApiError) =>
    err.code === 'conflict' ? 'Already handled — refreshing' : err.userMessage;

  const handleRejectConfirm = () => {
    action.mutate(
      {
        connection_id: connectionId,
        current_status: 'pending_admin' as AdminConnectionStatus,
        action: 'reject',
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Rejected');
          setRejectOpen(false);
          setNote('');
        },
        onError: (err) => {
          toast.error(errorToast(err));
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <InlineExecutionButton
          size="sm"
          mutation={action}
          input={{
            connection_id: connectionId,
            current_status: 'pending_admin' as AdminConnectionStatus,
            action: 'approve' as const,
          }}
          onSuccessToast={() => 'Approved'}
          onErrorToast={errorToast}
        >
          Approve
        </InlineExecutionButton>
        <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}>
          Reject
        </Button>
      </div>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setNote('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject connection request</DialogTitle>
            <DialogDescription>
              Optionally add a note explaining the rejection. The requester will see this message.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[100px] w-full resize-none rounded-md border border-border bg-surface p-3 text-sm text-ink-body placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
            placeholder="Reason for rejection (optional)"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setNote('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={action.isPending} onClick={handleRejectConfirm}>
              {action.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
  const qc = useQueryClient();
  const navigate = useNavigate();

  const items = useMemo(
    () => (list.data?.pages ?? []).flatMap((page) => page.items),
    [list.data?.pages],
  );

  const columns = useMemo<ColumnDef<AdminConnection>[]>(
    () => [
      {
        id: 'requester',
        header: 'Requester',
        cell: ({ row }) => {
          const p = row.original.requester;
          const primary = partyPrimary(p);
          const secondary = partySecondary(p);
          return (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => navigate(`/search/profile/${p.user_id}`)}
                className="text-left font-medium text-ink-heading hover:text-brand hover:underline"
              >
                {primary}
              </button>
              {secondary ? <span className="text-xs text-ink-muted">{secondary}</span> : null}
              <RoleBadge role={p.role} className="self-start" />
            </div>
          );
        },
      },
      {
        id: 'target',
        header: 'Target',
        cell: ({ row }) => {
          const p = row.original.target;
          const primary = partyPrimary(p);
          const secondary = partySecondary(p);
          return (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => navigate(`/search/profile/${p.user_id}`)}
                className="text-left font-medium text-ink-heading hover:text-brand hover:underline"
              >
                {primary}
              </button>
              {secondary ? <span className="text-xs text-ink-muted">{secondary}</span> : null}
              <RoleBadge role={p.role} className="self-start" />
            </div>
          );
        },
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
          return <RowActions connectionId={row.original.connection_id} />;
        },
      },
    ],
    [navigate],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Connection queue"
        subtitle="Review and act on connection requests across the community."
      />

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
                ? "Approved by admin, awaiting the target user's response."
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
                  description="When new requests come in, they'll appear here."
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
