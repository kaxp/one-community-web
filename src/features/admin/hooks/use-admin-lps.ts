import { useQuery } from '@tanstack/react-query';
import { getAdminLps, type AdminLpsArgs } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { LpCrmListResponse } from '@/features/admin/schemas';

export function useAdminLps(args: AdminLpsArgs = {}) {
  return useQuery<LpCrmListResponse, ApiError>({
    queryKey: qk.admin.lps(args),
    queryFn: () => getAdminLps(args),
    staleTime: 30_000,
  });
}
