import { useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useMatchSuggestions } from '@/features/matchmaking/hooks/use-match-suggestions';
import { SuggestionCard } from '@/features/matchmaking/components/SuggestionCard';
import { useUser } from '@/auth/use-auth';
import { qk } from '@/api/query-keys';
import { PageHeader } from '@/components/layout/PageHeader';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

// PRD §7.8.5 — user-facing matchmaking list. Card grid (md:grid-cols-2). The
// empty-state copy nudges users to "check back on Monday" since suggestions
// are generated weekly. Refetch-on-focus is intentionally OFF (see hook).
export function MatchmakingPage() {
  const list = useMatchSuggestions();
  const user = useUser();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Opportunities"
        subtitle="Curated matches for you. Tell us which ones look right and we'll set up the introduction."
      />

      {list.isLoading ? (
        <div
          style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}
          data-testid="suggestions-loading"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState
          error={list.error}
          onRetry={() => {
            void list.refetch();
          }}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No opportunities yet"
          description="Your personalised opportunities will appear here once matched."
        />
      ) : (
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 14,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
          data-testid="suggestions-grid"
        >
          {(list.data ?? []).map((s) => (
            <li key={s.id}>
              <SuggestionCard
                suggestion={s}
                myUserId={user?.id ?? null}
                onConflict={() => {
                  void qc.invalidateQueries({ queryKey: qk.matchmaking.suggestions });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
