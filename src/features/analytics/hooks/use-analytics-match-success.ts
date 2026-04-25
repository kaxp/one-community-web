import { useQuery } from '@tanstack/react-query';
import { getAnalyticsMatchSuccess } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AnalyticsMatchSuccess } from '@/features/analytics/schemas';

// PRD §7.14.6 — weekly matchmaking effectiveness.
export function useAnalyticsMatchSuccess() {
  return useQuery<AnalyticsMatchSuccess, ApiError>({
    queryKey: qk.analytics.matchSuccess,
    queryFn: () => getAnalyticsMatchSuccess(),
    staleTime: 60_000,
  });
}
