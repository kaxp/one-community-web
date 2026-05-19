import { useQuery } from '@tanstack/react-query';
import { getAnalyticsUserActivities, getAnalyticsUserSearchHistory } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import type { UserActivityItem, UserSearchEntry } from '@/features/analytics/schemas';

export function useAnalyticsUserActivities(args: { limit?: number; offset?: number } = {}) {
  return useQuery<{ items: UserActivityItem[]; total: number }, ApiError>({
    queryKey: ['analytics', 'user-activities', args],
    queryFn: () => getAnalyticsUserActivities(args),
    staleTime: 30_000,
  });
}

export function useAnalyticsUserSearchHistory(userId: string | null) {
  return useQuery<{ items: UserSearchEntry[] }, ApiError>({
    queryKey: ['analytics', 'user-activities', userId, 'searches'],
    queryFn: () => getAnalyticsUserSearchHistory(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
