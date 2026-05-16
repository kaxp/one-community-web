import { useQuery } from '@tanstack/react-query';
import { getAdminFounders, type AdminFoundersArgs } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminFoundersResponse } from '@/features/admin/schemas';

export function useAdminFounders(args: AdminFoundersArgs = {}) {
  return useQuery<AdminFoundersResponse, ApiError>({
    queryKey: qk.admin.founders(args),
    queryFn: () => getAdminFounders(args),
    staleTime: 30_000,
  });
}
