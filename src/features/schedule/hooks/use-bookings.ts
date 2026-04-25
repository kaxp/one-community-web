import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { getScheduleBookings } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { BookingsResponse } from '@/features/schedule/schemas';

// PRD §7.10.3 — caller's meetings (cursor-paginated).
export function useBookings({ limit = 50 }: { limit?: number } = {}) {
  return useInfiniteQuery<
    BookingsResponse,
    ApiError,
    InfiniteData<BookingsResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.meetings.bookings(limit),
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const args: { limit: number; cursor?: string } = { limit };
      if (pageParam) args.cursor = pageParam;
      return getScheduleBookings(args);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
