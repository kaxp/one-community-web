import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { getProfileViewers } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { ProfileViewersResponse } from '@/features/profile-viewers/schemas';

// PRD §7.7.3 — cursor-paginated "Who viewed me" list. Backend dedupes at the
// DB level so each viewer appears at most once — DO NOT count repeat views
// on the client; that is a backend concern.
export function useProfileViewers({ limit = 50 }: { limit?: number } = {}) {
  return useInfiniteQuery<
    ProfileViewersResponse,
    ApiError,
    InfiniteData<ProfileViewersResponse>,
    readonly unknown[],
    string | null
  >({
    queryKey: qk.interactions.profileViewers(limit),
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      const args: { limit: number; cursor?: string } = { limit };
      if (pageParam) args.cursor = pageParam;
      return getProfileViewers(args);
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
