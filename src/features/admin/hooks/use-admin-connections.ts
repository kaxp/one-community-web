import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { getAdminConnections } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AdminConnectionsResponse, AdminConnectionStatus } from '@/features/admin/schemas';

interface UseAdminConnectionsArgs {
  status: AdminConnectionStatus;
  enabled?: boolean;
}

// PRD §7.12.2: cursor-paginated admin connection list. Page size 20.
export function useAdminConnections({ status, enabled = true }: UseAdminConnectionsArgs) {
  return useInfiniteQuery<
    AdminConnectionsResponse,
    ApiError,
    InfiniteData<AdminConnectionsResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.admin.connections.list(status),
    enabled,
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const args: { status: AdminConnectionStatus; cursor?: string } = { status };
      if (pageParam) args.cursor = pageParam;
      return getAdminConnections(args);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
