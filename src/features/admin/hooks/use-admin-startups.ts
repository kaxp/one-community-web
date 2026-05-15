import { useQuery } from '@tanstack/react-query';
import { getAdminStartups, type AdminStartupsArgs } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminStartupsResponse } from '@/features/admin/schemas';

export function useAdminStartups(args: AdminStartupsArgs = {}) {
  return useQuery<AdminStartupsResponse, ApiError>({
    queryKey: qk.admin.startups(args),
    queryFn: () => getAdminStartups(args),
    staleTime: 30_000,
  });
}
