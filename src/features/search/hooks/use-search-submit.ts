import { useMutation, useQueryClient } from '@tanstack/react-query';
import { searchUnified } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { SearchFilters, SearchResponse } from '@/features/search/schemas';

interface Args {
  query: string;
  filters: SearchFilters;
}

// Backs the explicit "Search" button in <SearchPage>. Wraps a mutation around
// /search so the button can surface `isPending` while seeding the infinite-query
// cache for the matching key — keeping the form-submit path observable as a
// mutation without reaching for <ExecutionPanel> on a query-driven screen
// (CLAUDE.md §15 + §6.7.1; issues.md [I-8]).
export function useSearchSubmit({ query, filters }: Args) {
  const qc = useQueryClient();
  return useMutation<SearchResponse, ApiError, void>({
    mutationFn: async () => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        throw new Error('Query is required');
      }
      const resp = await searchUnified({ query: trimmed, filters, limit: 20 });
      qc.setQueryData(qk.search.query({ query: trimmed, filters }), {
        pages: [resp],
        pageParams: [null],
      });
      return resp;
    },
  });
}
