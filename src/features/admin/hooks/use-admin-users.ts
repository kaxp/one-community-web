import { useQuery } from '@tanstack/react-query';
import { getAdminUsers, type AdminUsersArgs } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminUsersResponse } from '@/features/admin/schemas';

export function useAdminUsers(args: AdminUsersArgs = {}) {
  return useQuery<AdminUsersResponse, ApiError>({
    queryKey: qk.admin.users(args),
    queryFn: () => getAdminUsers(args),
    staleTime: 30_000,
  });
}
