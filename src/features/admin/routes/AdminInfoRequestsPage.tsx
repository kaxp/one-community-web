import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { SectorBadgeList } from '@/components/badges/SectorBadge';
import { StartupStatusBadge } from '@/components/badges/StartupStatusBadge';
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

const TABLE_COLS = [
  'Requested By',
  'Requested For',
  'Status',
  'Sector',
  'Message',
  'Received Date',
  'Action Date',
  'Action',
  'Admin',
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
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
      <Badge variant={STATUS_BADGE[request.status]?.variant ?? 'secondary'}>
        {STATUS_BADGE[request.status]?.label ?? request.status}
      </Badge>
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

// ── Dash cell — centred empty placeholder ─────────────────────────────────────
function Dash() {
  return <span className="block text-center text-xs text-ink-muted">—</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminInfoRequestsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = params.get('status') ?? undefined;

  const query = useAdminInfoRequests(statusParam);
  const items = query.data?.items ?? [];

  const setStatus = (val: string | undefined) => {
    const sp = new URLSearchParams(params);
    if (val) sp.set('status', val);
    else sp.delete('status');
    setParams(sp, { replace: true });
  };

  // Route LP/potential_lp requesters to their LP funnel page; everyone else
  // to the search profile. For startups, prefer user_id over startup_id.
  const goToRequester = (req: InfoRequest['requester']) => {
    const role = req.role;
    if (role === 'lp' || role === 'potential_lp') {
      navigate(`/admin/lp-funnel/${req.user_id}`);
    } else {
      navigate(`/search/profile/${req.user_id}`);
    }
  };

  const goToStartup = (startup: InfoRequest['startup']) => {
    const targetId = startup.user_id ?? startup.startup_id;
    navigate(`/search/profile/${targetId}`);
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
        <CardContent className="overflow-x-auto p-0">
          {query.isLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="p-6">
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No requests"
                description={
                  statusParam ? `No ${statusParam} info requests.` : 'No info requests yet.'
                }
              />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  {TABLE_COLS.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                      scope="col"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-muted/50"
                  >
                    {/* Requested By */}
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => goToRequester(req.requester)}
                      >
                        <p className="font-medium text-brand hover:underline">
                          {req.requester.name ?? '—'}
                        </p>
                        <p className="text-xs text-ink-muted">{req.requester.role}</p>
                      </button>
                    </td>

                    {/* Requested For — company name only */}
                    <td className="px-4 py-3 align-top">
                      {req.startup.company_name ? (
                        <button
                          type="button"
                          className="font-medium text-brand hover:underline"
                          onClick={() => goToStartup(req.startup)}
                        >
                          {req.startup.company_name}
                        </button>
                      ) : (
                        <Dash />
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-top">
                      {req.startup.status ? (
                        <StartupStatusBadge status={req.startup.status} />
                      ) : (
                        <Dash />
                      )}
                    </td>

                    {/* Sector */}
                    <td className="px-4 py-3 align-top">
                      {req.startup.sector.length > 0 ? (
                        <SectorBadgeList sectors={req.startup.sector} />
                      ) : (
                        <Dash />
                      )}
                    </td>

                    {/* Message */}
                    <td className="px-4 py-3 align-top">
                      {req.message ? (
                        <p className="max-w-[160px] text-xs text-ink-body line-clamp-3">
                          {req.message}
                        </p>
                      ) : (
                        <Dash />
                      )}
                    </td>

                    {/* Received Date */}
                    <td className="px-4 py-3 align-top text-center">
                      {formatDate(req.created_at) ? (
                        <span className="whitespace-nowrap text-xs text-ink-muted">
                          {formatDate(req.created_at)}
                        </span>
                      ) : (
                        <Dash />
                      )}
                    </td>

                    {/* Action Date */}
                    <td className="px-4 py-3 align-top text-center">
                      {formatDate(req.decided_at) ? (
                        <span className="whitespace-nowrap text-xs text-ink-muted">
                          {formatDate(req.decided_at)}
                        </span>
                      ) : (
                        <Dash />
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 align-top">
                      <RowActions request={req} />
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3 align-top">
                      {req.decided_by?.name ? (
                        <span className="text-xs text-ink-body">{req.decided_by.name}</span>
                      ) : (
                        <Dash />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
