import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { listMyDigests } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { MyDigestsResponse } from '@/features/digest/me-schemas';

// PRD §7.13.5 — cursor-paginated recent digests for the caller. Cursor is the
// `sent_at` of the previous page's last item (opaque; passed through as-is).
export function useMyDigests({ limit = 20 }: { limit?: number } = {}) {
  return useInfiniteQuery<
    MyDigestsResponse,
    ApiError,
    InfiniteData<MyDigestsResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.me.digest.recent(limit),
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const args: { limit: number; cursor?: string } = { limit };
      if (pageParam) args.cursor = pageParam;
      return listMyDigests(args);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
