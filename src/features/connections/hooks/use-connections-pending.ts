import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { listPendingConnections } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { PendingConnectionsResponse } from '@/features/connections/schemas';

// PRD §7.6.5 — `GET /connections/pending` (incoming + outgoing).
// Direction filtering is client-side per §7.6.5 transformation note —
// the backend doesn't yet accept a direction query param.
export function useConnectionsPending({ limit = 50 }: { limit?: number } = {}) {
  return useInfiniteQuery<
    PendingConnectionsResponse,
    ApiError,
    InfiniteData<PendingConnectionsResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.connections.pending(limit),
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const args: { limit: number; cursor?: string } = { limit };
      if (pageParam) args.cursor = pageParam;
      return listPendingConnections(args);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
