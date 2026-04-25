import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { listConnections } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AcceptedConnectionsResponse } from '@/features/connections/schemas';

// PRD §7.6.4 — `GET /connections` (accepted list). Cursor-paginated, page size 50.
export function useConnections({ limit = 50 }: { limit?: number } = {}) {
  return useInfiniteQuery<
    AcceptedConnectionsResponse,
    ApiError,
    InfiniteData<AcceptedConnectionsResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.connections.list(limit),
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const args: { limit: number; cursor?: string } = { limit };
      if (pageParam) args.cursor = pageParam;
      return listConnections(args);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
