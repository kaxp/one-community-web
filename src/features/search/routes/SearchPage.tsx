import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { SearchBar } from '@/features/search/components/SearchBar';
import { ResultCard } from '@/features/search/components/ResultCard';
import { SearchLoadingState } from '@/features/search/components/SearchLoadingState';
import { TypeSelector, type SearchTypeOption } from '@/features/search/components/TypeSelector';
import { useSearch } from '@/features/search/hooks/use-search';
import { useSearchSubmit } from '@/features/search/hooks/use-search-submit';
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  type SearchFilters,
  type SearchResponse,
  type SearchTargetType,
} from '@/features/search/schemas';
import type { UserRole } from '@/types/enums';
import { useRole } from '@/auth/use-auth';
import { isMaskedSearchRole, isStartupRole } from '@/lib/role-capabilities';

/** Parses "top 5", "first 10", "show me 3 startups" → number, else null. */
function extractCountFromQuery(q: string): number | null {
  const patterns = [
    /\btop\s+(\d+)\b/i,
    /\bfirst\s+(\d+)\b/i,
    /\bshow\s+(?:me\s+)?(\d+)\b/i,
    /\b(\d+)\s+(?:startups?|lps?|investors?|funds?|companies|company)\b/i,
  ];
  for (const p of patterns) {
    const m = q.match(p);
    if (m) {
      const raw = m[1] ?? m[2];
      if (!raw) continue;
      const n = parseInt(raw, 10);
      if (n >= 1 && n <= 100) return n;
    }
  }
  return null;
}

// Startup roles search for LPs (investors); everyone else searches for startups.
function defaultTargetType(role: UserRole | null): SearchTargetType {
  return isStartupRole(role) ? 'lp' : 'startup';
}

// URL param name for the selected type: ?t=startup | ?t=lp (nothing = "all")
const TYPE_PARAM = 't';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const role = useRole();
  const isMasked = isMaskedSearchRole(role);
  const defType = useMemo(() => defaultTargetType(role), [role]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState(params.get('q') ?? '');
  // submittedQuery drives the actual search — only updated on explicit submit.
  const [submittedQuery, setSubmittedQuery] = useState(params.get('q') ?? '');
  const filters = useMemo(() => filtersFromSearchParams(params), [params]);
  // selectedType: 'startup' | 'lp' | 'all'
  const [selectedType, setSelectedType] = useState<SearchTypeOption>(
    (params.get(TYPE_PARAM) as SearchTypeOption | null) ?? defType,
  );

  // targetType sent to the API: null for 'all' (GPT classifies)
  const targetType: SearchTargetType | null = selectedType === 'all' ? null : selectedType;

  // ── UX rule: clear results when the search box is emptied ─────────────────
  // Without this, changing filters with an empty box would still call the API
  // because submittedQuery retained the old value.
  useEffect(() => {
    if (query.trim().length === 0) {
      setSubmittedQuery('');
    }
  }, [query]);

  const queryLimit = useMemo(
    () => extractCountFromQuery(submittedQuery.trim()) ?? 20,
    [submittedQuery],
  );

  const search = useSearch({
    query: submittedQuery.trim(),
    filters,
    enabled: submittedQuery.trim().length > 0,
    targetType,
    limit: queryLimit,
  });

  const submitMutation = useSearchSubmit({ query, filters, targetType, limit: queryLimit });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const buildParams = (q: string, f: SearchFilters, t: SearchTypeOption) => {
    const sp = new URLSearchParams(filtersToSearchParams(f));
    if (q.trim().length > 0) sp.set('q', q.trim());
    if (t !== defType) sp.set(TYPE_PARAM, t); // only persist if non-default
    return sp;
  };

  const onSubmit = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return; // never fire with empty box
    submitMutation.reset();
    submitMutation.mutate();
    setSubmittedQuery(trimmed);
    const sp = buildParams(trimmed, filters, selectedType);
    if (sp.toString() !== params.toString()) setParams(sp, { replace: true });
  };

  const onFiltersChange = (next: SearchFilters) => {
    // Filters only affect results if a query is already submitted.
    const sp = buildParams(query, next, selectedType);
    if (sp.toString() !== params.toString()) setParams(sp, { replace: true });
    // Do NOT call onSubmit — let the infinite query re-fetch automatically
    // when its `filters` dep changes (only if submittedQuery is non-empty).
  };

  const onTypeChange = (t: SearchTypeOption) => {
    setSelectedType(t);
    // Persist to URL
    const sp = buildParams(query, filters, t);
    if (sp.toString() !== params.toString()) setParams(sp, { replace: true });
    // If results are already showing, re-run search with the new type.
    if (submittedQuery.trim().length > 0) {
      submitMutation.reset();
      submitMutation.mutate();
    }
  };

  const isButtonPending = submitMutation.isPending;
  const firstPage = search.data?.pages[0];
  const totalLoaded = (search.data?.pages ?? []).reduce((n, p) => n + p.results.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Search</h1>
      <Card>
        <CardHeader>
          <CardTitle>Search the community</CardTitle>
          <CardDescription>
            Semantic search across LPs and startups. Type a query and explore matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TypeSelector value={selectedType} onChange={onTypeChange} defaultType={defType} />
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={onSubmit}
            isPending={isButtonPending}
          />
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
        query={submittedQuery.trim()}
        filters={filters}
        onClearFilters={() => onFiltersChange({})}
        isMasked={isMasked}
        suppressError={submitMutation.isError}
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
  suppressError?: boolean;
}

function SearchResults({
  state,
  firstPage,
  totalLoaded,
  query,
  filters,
  onClearFilters,
  isMasked,
  suppressError,
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
    return <SearchLoadingState />;
  }
  if (state.isError && !suppressError) {
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
        title={`No matches for "${query}"`}
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
