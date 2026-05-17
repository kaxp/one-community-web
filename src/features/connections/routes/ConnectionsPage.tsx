import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useConnections } from '@/features/connections/hooks/use-connections';
import { AcceptedConnectionCard } from '@/features/connections/components/AcceptedConnectionCard';

// PRD §7.6.4 — `/connections` accepted list. Cursor-paginated infinite scroll
// with explicit Load-more button (matches AdminConnectionsPage pagination UX).
export function ConnectionsPage() {
  const list = useConnections();
  const items = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.items), [list.data?.pages]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Network</h1>
        <p className="text-sm text-ink-muted">
          People you&apos;re connected with. Contact details are visible after the connection is
          accepted.
        </p>
      </div>

      {list.isLoading ? (
        <div className="flex flex-col gap-3" data-testid="connections-loading">
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
          icon={Users}
          title="No connections yet"
          description="When a request is accepted by both sides, the connection will show up here."
          action={
            <Button asChild>
              <Link to="/search">Explore search</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((row) => (
            <AcceptedConnectionCard key={row.connection_id} row={row} />
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
