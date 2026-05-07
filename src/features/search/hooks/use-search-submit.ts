import { useMutation, useQueryClient } from '@tanstack/react-query';
import { searchUnified } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { SearchFilters, SearchResponse, SearchTargetType } from '@/features/search/schemas';

interface Args {
  query: string;
  filters: SearchFilters;
  targetType?: SearchTargetType | null;
  limit?: number;
}

export function useSearchSubmit({ query, filters, targetType, limit = 20 }: Args) {
  const qc = useQueryClient();
  return useMutation<SearchResponse, ApiError, void>({
    mutationFn: async () => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        throw new Error('Query is required');
      }
      const resp = await searchUnified({
        query: trimmed,
        filters,
        limit,
        ...(targetType ? { target_type: targetType } : {}),
      });
      qc.setQueryData(qk.search.query({ query: trimmed, filters, targetType, limit }), {
        pages: [resp],
        pageParams: [null],
      });
      return resp;
    },
  });
}
