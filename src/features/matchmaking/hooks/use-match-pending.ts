import { useQuery } from '@tanstack/react-query';
import { getMatchPending } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { MatchPendingResponse } from '@/features/matchmaking/schemas';

// PRD §7.8.4 — admin pending list. 30s staleTime; admin actions invalidate.
export function useMatchPending() {
  return useQuery<MatchPendingResponse, ApiError>({
    queryKey: qk.matchmaking.pending,
    queryFn: () => getMatchPending(),
    staleTime: 30_000,
  });
}
