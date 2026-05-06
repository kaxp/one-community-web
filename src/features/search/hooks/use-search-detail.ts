import { useQuery } from '@tanstack/react-query';
import { getSearchDetailLp, getSearchDetailStartup } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { SearchDetailLp, SearchDetailStartup } from '@/features/search/schemas';

export function useStartupDetail(userId: string | undefined) {
  return useQuery<SearchDetailStartup, ApiError>({
    queryKey: userId ? qk.search.detailStartup(userId) : ['search', 'detail', 'startup', 'noop'],
    queryFn: () => getSearchDetailStartup(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useLpDetail(userId: string | undefined) {
  return useQuery<SearchDetailLp, ApiError>({
    queryKey: userId ? qk.search.detailLp(userId) : ['search', 'detail', 'lp', 'noop'],
    queryFn: () => getSearchDetailLp(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
