import { useQuery } from '@tanstack/react-query';
import { getAdminLpPocList } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';

export function useAdminLpPocList() {
  return useQuery<string[], ApiError>({
    queryKey: ['admin', 'lps', 'poc-list'],
    queryFn: getAdminLpPocList,
    staleTime: 60_000,
  });
}
