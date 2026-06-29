import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { SectorBadgeList } from '@/components/badges/SectorBadge';
import { StartupStageBadge } from '@/components/badges/StartupStageBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useAdminInfoRequests,
  useAdminInfoRequestAction,
} from '@/features/admin/hooks/use-info-requests';
import type { InfoRequest } from '@/features/admin/schemas';
import { cn } from '@/lib/cn';

const STATUS_TABS = [
  { value: undefined, label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const STATUS_BADGE: Record<string, { label: string; variant: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Row actions ───────────────────────────────────────────────────────────────

function RowActions({ request }: { request: InfoRequest }) {
  const action = useAdminInfoRequestAction();
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);

  if (request.status !== 'pending') {
    return (
      <span className="text-xs text-ink-muted">
        {request.decided_at ? formatDate(request.decided_at) : '—'}
      </span>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-ink-muted">
          {confirming === 'approve' ? 'Approve?' : 'Reject?'}
        </span>
        <Button
          size="sm"
          variant={confirming === 'approve' ? 'default' : 'destructive'}
          className="h-6 px-2 text-xs"
          disabled={action.isPending}
          onClick={() => {
            action.mutate(
              { id: request.id, body: { action: confirming } },
              { onSettled: () => setConfirming(null) },
            );
          }}
        >
          Yes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={() => setConfirming(null)}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-success hover:text-success"
        onClick={() => setConfirming('approve')}
      >
        <Check className="mr-0.5 h-3 w-3" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
        onClick={() => setConfirming('reject')}
      >
        <X className="mr-0.5 h-3 w-3" />
        Reject
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminInfoRequestsPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status') ?? undefined;

  const query = useAdminInfoRequests(statusParam);
  const items = query.data?.items ?? [];

  const setStatus = (val: string | undefined) => {
    const sp = new URLSearchParams(params);
    if (val) sp.set('status', val);
    else sp.delete('status');
    setParams(sp, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Startups Info Requests"
        subtitle="Review and approve investor requests to view company identities."
      />

      {/* Status tabs */}
      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusParam === tab.value
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border bg-surface text-ink-muted hover:text-ink-body',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Requests</CardTitle>
          <CardDescription>
            {query.isLoading
              ? 'Loading…'
              : `${items.length} request${items.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No requests"
              description={
                statusParam ? `No ${statusParam} info requests.` : 'No info requests yet.'
              }
            />
          ) : (
            <div className="divide-y">
              {items.map((req) => {
                const statusInfo = STATUS_BADGE[req.status] ?? {
                  label: req.status,
                  variant: 'secondary' as const,
                };
                return (
                  <div key={req.id} className="flex flex-wrap items-center gap-4 py-3">
                    {/* Requester */}
                    <div className="min-w-[140px] flex-1">
                      <p className="text-sm font-medium text-ink-heading">
                        {req.requester.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-ink-muted">{req.requester.role}</p>
                    </div>

                    {/* Startup */}
                    <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                      <SectorBadgeList sectors={req.startup.sector} />
                      <StartupStageBadge stage={req.startup.stage} />
                    </div>

                    {/* Message */}
                    <div className="hidden min-w-[160px] flex-1 md:block">
                      {req.message ? (
                        <p className="text-xs text-ink-body line-clamp-2">{req.message}</p>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </div>

                    {/* Status + Date */}
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <span className="text-[10px] text-ink-muted">
                        {formatDate(req.created_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      <RowActions request={req} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
