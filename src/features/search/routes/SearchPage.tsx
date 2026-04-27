import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/features/search/components/SearchBar';
import { FilterChips } from '@/features/search/components/FilterChips';
import { ResultCard } from '@/features/search/components/ResultCard';
import { useSearch } from '@/features/search/hooks/use-search';
import { useSearchSubmit } from '@/features/search/hooks/use-search-submit';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  type SearchFilters,
} from '@/features/search/schemas';
import type { SearchResponse } from '@/features/search/schemas';
import { useRole } from '@/auth/use-auth';
import { isMaskedSearchRole } from '@/lib/role-capabilities';

const DEBOUNCE_MS = 400;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const filters = useMemo(() => filtersFromSearchParams(params), [params]);
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  // Partners see Crunchbase-style locked cards (decisions.md [P-20] / [P-21]).
  // The backend strips fields from the response; the UI renders the full card
  // structure with blurred placeholders for the withheld values.
  const role = useRole();
  const isMasked = isMaskedSearchRole(role);

  // Update the URL when the debounced query stabilises.
  useEffect(() => {
    const next = new URLSearchParams(filtersToSearchParams(filters));
    if (debouncedQuery.trim().length > 0) next.set('q', debouncedQuery.trim());
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters]);

  const search = useSearch({
    query: debouncedQuery.trim(),
    filters,
    enabled: debouncedQuery.trim().length > 0,
  });

  // The explicit "Search" button surfaces a mutation state for `isPending`
  // wiring; logic lives in `useSearchSubmit` per CLAUDE.md §15 / issues.md [I-8].
  const submitMutation = useSearchSubmit({ query, filters });

  const onSubmit = () => {
    submitMutation.reset();
    submitMutation.mutate();
  };

  const onFiltersChange = (next: SearchFilters) => {
    const sp = new URLSearchParams(filtersToSearchParams(next));
    if (query.trim().length > 0) sp.set('q', query.trim());
    setParams(sp, { replace: true });
  };

  const isFetching = search.isFetching || submitMutation.isPending;
  const firstPage = search.data?.pages[0];
  const totalLoaded = (search.data?.pages ?? []).reduce((n, p) => n + p.results.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Visually-hidden page heading so the doc starts at h1 → CardTitle h2
          flow without changing the existing card-only design (issues.md [A-4]). */}
      <h1 className="sr-only">Search</h1>
      <Card>
        <CardHeader>
          <CardTitle>Search the community</CardTitle>
          <CardDescription>
            Semantic search across LPs and startups. Type a query, refine with filters, and explore
            matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SearchBar value={query} onChange={setQuery} onSubmit={onSubmit} isPending={isFetching} />
          <FilterChips filters={filters} onChange={onFiltersChange} />
          {submitMutation.isError ? (
            <ErrorState
              error={submitMutation.error}
              compact
              onRetry={() => {
                submitMutation.reset();
                onSubmit();
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      <SearchResults
        state={search}
        firstPage={firstPage}
        totalLoaded={totalLoaded}
        query={debouncedQuery.trim()}
        filters={filters}
        onClearFilters={() => onFiltersChange({})}
        isMasked={isMasked}
      />
    </div>
  );
}

interface SearchResultsProps {
  state: ReturnType<typeof useSearch>;
  firstPage: SearchResponse | undefined;
  totalLoaded: number;
  query: string;
  filters: SearchFilters;
  onClearFilters: () => void;
  isMasked: boolean;
}

function SearchResults({
  state,
  firstPage,
  totalLoaded,
  query,
  filters,
  onClearFilters,
  isMasked,
}: SearchResultsProps) {
  if (query.length === 0) {
    return (
      <EmptyState
        title="Start a search"
        description="Type what you're looking for above. Filters are optional but help narrow the result list."
      />
    );
  }
  if (state.isLoading || (state.isFetching && !firstPage)) {
    return (
      <div className="grid gap-3 md:grid-cols-2" data-testid="search-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  if (state.isError) {
    return (
      <ErrorState
        error={state.error}
        onRetry={() => {
          void state.refetch();
        }}
      />
    );
  }
  if (!firstPage || firstPage.results.length === 0) {
    const filterCount =
      (filters.sector?.length ?? 0) +
      (filters.stage?.length ?? 0) +
      (filters.geography?.length ?? 0);
    return (
      <EmptyState
        title={`No matches for “${query}”`}
        description={
          filterCount > 0
            ? `We couldn't find anyone matching that query with the ${filterCount} active filter${filterCount === 1 ? '' : 's'}. Try clearing filters or rephrasing.`
            : 'Try rephrasing — broader terms, a different sector, or a related concept often surface more matches.'
        }
        action={
          filterCount > 0 ? (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="search-results">
      {firstPage.stage3_applied === false ? (
        <div
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-ink-body"
          role="status"
          data-testid="stage3-fallback-banner"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
          <span>AI ranking temporarily unavailable — showing vector similarity only.</span>
        </div>
      ) : null}
      <p className="text-xs text-ink-muted">
        Showing {totalLoaded} of {firstPage.total}{' '}
        {firstPage.target_type === 'lp' ? 'LPs' : 'startups'}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(state.data?.pages ?? []).flatMap((page) =>
          page.results.map((item) => (
            <ResultCard
              key={item.user_id}
              item={item}
              targetType={page.target_type}
              query={query}
              isMasked={isMasked}
            />
          )),
        )}
      </div>
      {state.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={state.isFetchingNextPage}
            onClick={() => state.fetchNextPage()}
          >
            {state.isFetchingNextPage ? (
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
