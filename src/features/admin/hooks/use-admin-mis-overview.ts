import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { getAdminMisOverview } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { MISOverviewListResponse, MISOverviewRange } from '@/features/admin/schemas';

// Phase 7.2.g — cursor-paginated admin MIS overview.
export function useAdminMisOverview(range: MISOverviewRange) {
  return useInfiniteQuery<
    MISOverviewListResponse,
    ApiError,
    InfiniteData<MISOverviewListResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.admin.misOverview(range),
    queryFn: ({ pageParam }) => {
      const args: { range: MISOverviewRange; cursor?: string } = { range };
      if (pageParam) args.cursor = pageParam;
      return getAdminMisOverview(args);
    },
    initialPageParam: null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 0,
  });
}
