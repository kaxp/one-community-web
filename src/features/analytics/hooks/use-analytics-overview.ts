import { useQuery } from '@tanstack/react-query';
import { getAnalyticsOverview } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AnalyticsOverview } from '@/features/analytics/schemas';

// PRD §7.14.1 — top-level admin KPIs.
export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverview, ApiError>({
    queryKey: qk.analytics.overview,
    queryFn: () => getAnalyticsOverview(),
    staleTime: 60_000,
  });
}
