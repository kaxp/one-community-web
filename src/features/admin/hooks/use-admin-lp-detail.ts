import { useQuery } from '@tanstack/react-query';
import { getAdminLpDetail } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { LpCrmDetail } from '@/features/admin/schemas';

export function useAdminLpDetail(userId: string | null) {
  return useQuery<LpCrmDetail, ApiError>({
    queryKey: qk.admin.lpDetail(userId ?? ''),
    queryFn: () => getAdminLpDetail(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
