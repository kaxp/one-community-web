import { useMemo } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useProfileViewers } from '@/features/profile-viewers/hooks/use-profile-viewers';
import { ViewerCard } from '@/features/profile-viewers/components/ViewerCard';

// PRD §7.7.3 — "Who viewed me". Cursor-paginated infinite list with
// click-through to /profile/:user_id. PII rule (§13 G11) is enforced inside
// `<ViewerCard>` — see that file's banner comment + the regression test in
// `pii-discipline.test.ts`.
export function ProfileViewersPage() {
  const list = useProfileViewers();

  const items = useMemo(
    () => (list.data?.pages ?? []).flatMap((page) => page.items),
    [list.data?.pages],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Who viewed me</h1>
        <p className="text-sm text-ink-muted">
          People who&apos;ve looked at your profile recently. Tap a card to see theirs.
        </p>
      </header>

      {list.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="viewers-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
          icon={Eye}
          title="No one has viewed your profile yet."
          description="Once others find you in search or a connection request, you'll see them here."
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="viewers-grid">
            {items.map((item) => (
              <li key={item.viewer.user_id}>
                <ViewerCard item={item} />
              </li>
            ))}
          </ul>
          {list.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={list.isFetchingNextPage}
                onClick={() => list.fetchNextPage()}
                data-testid="viewers-load-more"
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
        </>
      )}
    </div>
  );
}
