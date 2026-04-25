import { useQuery } from '@tanstack/react-query';
import { getDigestHistory } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { DigestHistoryResponse } from '@/features/digest/schemas';

// PRD §7.13.4 — sent rows. Limit defaults to 50 per spec.
export function useDigestHistory({ limit = 50 }: { limit?: number } = {}) {
  return useQuery<DigestHistoryResponse, ApiError>({
    queryKey: qk.digest.history(limit),
    queryFn: () => getDigestHistory({ limit }),
    staleTime: 30_000,
  });
}
