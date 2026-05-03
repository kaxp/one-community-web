import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { getAdminInboundPitches } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { InboundPitchesResponse, InboundPitchRange } from '@/features/admin/schemas';

// Phase 7.2.f — cursor-paginated inbound pitches list.
export function useAdminInboundPitches(range: InboundPitchRange) {
  return useInfiniteQuery<
    InboundPitchesResponse,
    ApiError,
    InfiniteData<InboundPitchesResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.admin.inboundPitches(range),
    queryFn: ({ pageParam }) => {
      const args: { range: InboundPitchRange; cursor?: string } = { range };
      if (pageParam) args.cursor = pageParam;
      return getAdminInboundPitches(args);
    },
    initialPageParam: null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 0,
  });
}
