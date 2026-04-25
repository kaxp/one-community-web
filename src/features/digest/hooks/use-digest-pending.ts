import { useQuery } from '@tanstack/react-query';
import { getDigestPending } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { DigestPendingResponse } from '@/features/digest/schemas';

// PRD §7.13.3 — admin review queue.
export function useDigestPending() {
  return useQuery<DigestPendingResponse, ApiError>({
    queryKey: qk.digest.pending,
    queryFn: () => getDigestPending(),
    staleTime: 30_000,
  });
}
