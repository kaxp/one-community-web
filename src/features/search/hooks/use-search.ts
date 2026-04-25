import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { searchUnified } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { SearchFilters, SearchRequest, SearchResponse } from '@/features/search/schemas';

const SEARCH_PAGE_LIMIT = 20;

interface UseSearchArgs {
  query: string;
  filters: SearchFilters;
  enabled: boolean;
}

// Per PRD §7.4.1 the query is debounced 400ms upstream of this hook (see SearchPage).
// Cursor pagination via `next_cursor` (CLAUDE.md §5.5).
export function useSearch({ query, filters, enabled }: UseSearchArgs) {
  return useInfiniteQuery<
    SearchResponse,
    ApiError,
    InfiniteData<SearchResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.search.query({ query, filters }),
    enabled: enabled && query.trim().length > 0,
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const body: SearchRequest = { query, filters, limit: SEARCH_PAGE_LIMIT };
      if (pageParam !== null && pageParam !== undefined) body.cursor = pageParam;
      return searchUnified(body);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 0,
    gcTime: 60_000,
  });
}
