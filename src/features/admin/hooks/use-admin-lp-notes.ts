import { useQuery } from '@tanstack/react-query';
import { getAdminLpNotes } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { LpCrmNotesResponse } from '@/features/admin/schemas';

export function useAdminLpNotes(userId: string | null) {
  return useQuery<LpCrmNotesResponse, ApiError>({
    queryKey: qk.admin.lpNotesAll(userId ?? ''),
    queryFn: () => getAdminLpNotes(userId!),
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}
