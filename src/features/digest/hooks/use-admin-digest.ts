import { useQuery } from '@tanstack/react-query';
import { getAdminDigest } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminDigestResponse } from '@/features/digest/schemas';

// PRD §7.12.3 — list of digest workflows.
export function useAdminDigest() {
  return useQuery<AdminDigestResponse, ApiError>({
    queryKey: qk.admin.digest,
    queryFn: () => getAdminDigest(),
    staleTime: 60_000,
  });
}
