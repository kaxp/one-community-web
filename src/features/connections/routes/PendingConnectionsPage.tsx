import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useConnectionsPending } from '@/features/connections/hooks/use-connections-pending';
import { PendingConnectionCard } from '@/features/connections/components/PendingConnectionCard';
import { PENDING_DIRECTIONS, type PendingDirection } from '@/features/connections/schemas';
import { cn } from '@/lib/cn';

const DEFAULT_DIRECTION: PendingDirection = 'incoming';

const DIRECTION_LABEL: Record<PendingDirection, string> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
};

const DIRECTION_DESCRIPTION: Record<PendingDirection, string> = {
  incoming: 'Requests where someone wants to connect with you. Accept or decline below.',
  outgoing: 'Requests you sent. Track admin and target progress here.',
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
    () => allItems.filter((row) => row.direction === direction),
    [allItems, direction],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Pending requests</h1>
        <p className="text-sm text-ink-muted">{DIRECTION_DESCRIPTION[direction]}</p>
      </div>

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
              ? 'When someone requests to connect with you, it will appear here.'
              : 'Requests you send will show up here while they are pending.'
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
