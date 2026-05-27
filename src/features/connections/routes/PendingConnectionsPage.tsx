import { useMemo } from 'react';
import type { ConnectionStatus } from '@/features/connections/schemas';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useConnectionsPending } from '@/features/connections/hooks/use-connections-pending';
import { PendingConnectionCard } from '@/features/connections/components/PendingConnectionCard';
import { PENDING_DIRECTIONS, type PendingDirection } from '@/features/connections/schemas';
import { cn } from '@/lib/cn';

const DEFAULT_DIRECTION: PendingDirection = 'incoming';

// Pending statuses appear first; final states (accepted/declined/rejected) at the bottom.
const STATUS_SORT_ORDER: Record<ConnectionStatus, number> = {
  pending_admin: 0,
  pending_target: 1,
  approved: 2,
  accepted: 3,
  declined: 4,
  rejected_admin: 5,
};

const DIRECTION_LABEL: Record<PendingDirection, string> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
};

const DIRECTION_DESCRIPTION: Record<PendingDirection, string> = {
  incoming: 'All connection requests addressed to you — respond to pending ones below.',
  outgoing: 'All connection requests you sent — track their current stage here.',
};

function isDirection(v: string | null): v is PendingDirection {
  return (PENDING_DIRECTIONS as readonly string[]).includes(v ?? '');
}

// PRD §7.6.5 — `/connections/pending`. Two URL-tabs (?direction=incoming|outgoing)
// filter client-side per §7.6.5 transformation note (server doesn't yet support
// a direction filter). Incoming pending_target rows get Accept/Decline; outgoing
// rows show a status pill — outgoing rows MUST NOT show Accept/Decline.
export function PendingConnectionsPage() {
  const [params, setParams] = useSearchParams();
  const dirParam = params.get('direction');
  const direction: PendingDirection = isDirection(dirParam) ? dirParam : DEFAULT_DIRECTION;

  const setDirection = (next: PendingDirection) => {
    const sp = new URLSearchParams(params);
    sp.set('direction', next);
    setParams(sp, { replace: true });
  };

  const list = useConnectionsPending();
  const allItems = useMemo(
    () => (list.data?.pages ?? []).flatMap((p) => p.items),
    [list.data?.pages],
  );
  const items = useMemo(
    () =>
      allItems
        .filter((row) => row.direction === direction)
        .sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99)),
    [allItems, direction],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pending Actions" subtitle={DIRECTION_DESCRIPTION[direction]} />

      <nav role="tablist" aria-label="Direction" className="flex flex-wrap gap-2">
        {PENDING_DIRECTIONS.map((d) => {
          const active = d === direction;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setDirection(d)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                active
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
              )}
              data-testid={`direction-${d}`}
            >
              {DIRECTION_LABEL[d]}
            </button>
          );
        })}
      </nav>

      {list.isLoading ? (
        <div className="flex flex-col gap-3" data-testid="pending-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
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
          icon={Inbox}
          title={direction === 'incoming' ? 'No incoming requests' : 'No outgoing requests'}
          description={
            direction === 'incoming'
              ? 'Connection requests sent to you will appear here.'
              : 'Connection requests you send will appear here.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((row) => (
            <PendingConnectionCard key={row.connection_id} row={row} />
          ))}
        </div>
      )}

      {list.hasNextPage ? (
        <div className="flex justify-center">
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
    </div>
  );
}
