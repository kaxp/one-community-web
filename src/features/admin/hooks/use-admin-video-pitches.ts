import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { getAdminVideoPitches } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { InboundPitchRange, VideoPitchesResponse } from '@/features/admin/schemas';

// Phase 4 menu Phase C2 (2026-05-28) — cursor-paginated WA video pitches list.
// Backs the "Video Pitches" tab on AdminInboundPitchesPage.
export function useAdminVideoPitches(range: InboundPitchRange) {
  return useInfiniteQuery<
    VideoPitchesResponse,
    ApiError,
    InfiniteData<VideoPitchesResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.admin.videoPitches(range),
    queryFn: ({ pageParam }) => {
      const args: { range: InboundPitchRange; cursor?: string } = { range };
      if (pageParam) args.cursor = pageParam;
      return getAdminVideoPitches(args);
    },
    initialPageParam: null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 0,
  });
}
