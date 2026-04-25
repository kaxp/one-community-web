import { useQuery } from '@tanstack/react-query';
import { getAnalyticsCohort } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { AnalyticsCohort } from '@/features/analytics/schemas';

// PRD §7.14.5 — monthly cohort retention.
export function useAnalyticsCohort({ months = 12 }: { months?: number } = {}) {
  return useQuery<AnalyticsCohort, ApiError>({
    queryKey: qk.analytics.cohort(months),
    queryFn: () => getAnalyticsCohort({ months }),
    staleTime: 60_000,
  });
}
